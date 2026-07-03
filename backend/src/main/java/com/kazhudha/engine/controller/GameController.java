package com.kazhudha.engine.controller;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.GameState;
import com.kazhudha.engine.domain.GameEvent;
import com.kazhudha.engine.domain.PlayedCard;
import com.kazhudha.engine.domain.Player;
import com.kazhudha.engine.domain.Suit;
import com.kazhudha.engine.exception.BusinessException;
import com.kazhudha.engine.exception.InvalidMoveException;
import com.kazhudha.engine.exception.SessionNotFoundException;
import com.kazhudha.engine.service.BotService;
import com.kazhudha.engine.service.DealerService;
import com.kazhudha.engine.service.GameRuleEngine;
import com.kazhudha.engine.service.GameSession;
import com.kazhudha.engine.service.GameSessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/game")
public class GameController {

    private final DealerService dealerService;
    private final GameRuleEngine gameRuleEngine;
    private final BotService botService;
    private final GameSessionManager sessionManager;

    @Autowired
    public GameController(DealerService dealerService, 
                          GameRuleEngine gameRuleEngine, 
                          BotService botService, 
                          GameSessionManager sessionManager) {
        this.dealerService = Objects.requireNonNull(dealerService);
        this.gameRuleEngine = Objects.requireNonNull(gameRuleEngine);
        this.botService = Objects.requireNonNull(botService);
        this.sessionManager = Objects.requireNonNull(sessionManager);
    }

    @RequestMapping(value = "/start", method = {RequestMethod.GET, RequestMethod.POST})
    public GameViewDTO startGame(@RequestParam(value = "sessionId", defaultValue = "default") String sessionId) {
        Player p1 = new Player("human", "Player 1 (You)", false);
        Player p2 = new Player("bot1", "Bot 1", true);
        Player p3 = new Player("bot2", "Bot 2", true);
        Player p4 = new Player("bot3", "Bot 3", true);

        List<Player> players = List.of(p1, p2, p3, p4);

        dealerService.shuffleAndDeal(players);

        String startingPlayerId = dealerService.determineStartingPlayer(players);

        GameState state = new GameState(players);
        state.setCurrentTurnPlayerId(startingPlayerId);

        GameSession session = sessionManager.createSession(sessionId, state, players);

        List<GameEvent> executionEvents = new ArrayList<>();
        synchronized (session) {
            runBotTurnsIfApplicable(session, executionEvents);
            return mapToView(state, executionEvents);
        }
    }

    @PostMapping("/play")
    public GameViewDTO playCard(
            @RequestParam(value = "sessionId", defaultValue = "default") String sessionId,
            @RequestBody PlayRequest request) {

        GameSession session;
        try {
            session = sessionManager.getSession(sessionId);
        } catch (SessionNotFoundException e) {
            throw new InvalidMoveException("Session not found. Please start a new game.");
        }

        List<GameEvent> executionEvents = new ArrayList<>();
        synchronized (session) {
            GameState state = session.getGameState();
            List<Card> discardedHistory = session.getDiscardedHistory();

            if (isGameOver(state)) {
                throw new InvalidMoveException("The game is already over.");
            }

            try {
                executePlayStep(state, discardedHistory, request.playerId(), request.card(), executionEvents);
                runBotTurnsIfApplicable(session, executionEvents);

                if (isGameOver(state)) {
                    sessionManager.terminateSession(sessionId);
                } else {
                    sessionManager.updateSession(sessionId, session);
                }
            } catch (IllegalStateException | IllegalArgumentException | BusinessException e) {
                throw new InvalidMoveException(e.getMessage());
            }

            return mapToView(state, executionEvents);
        }
    }

    @ExceptionHandler(InvalidMoveException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleInvalidMove(InvalidMoveException e) {
        return Map.of("error", e.getMessage());
    }

    private void executePlayStep(GameState state, List<Card> discardedHistory, String playerId, Card card, List<GameEvent> events) {
        boolean wasEmptyBefore = state.getTablePile().isEmpty();

        Suit activeSuit = state.getActiveRoundSuit();
        boolean isVettu = false;
        if (!wasEmptyBefore && card.suit() != activeSuit) {
            Player player = state.getPlayer(playerId);
            boolean hasActiveSuit = player.getHand().stream().anyMatch(c -> c.suit() == activeSuit);
            if (!hasActiveSuit) {
                isVettu = true;
            }
        }

        PlayedCard highestPlayedBeforeVettu = null;
        if (isVettu) {
            highestPlayedBeforeVettu = state.getTablePile().stream()
                    .filter(pc -> pc.card().suit() == activeSuit)
                    .max(Comparator.comparingInt(pc -> pc.card().rank().getValue()))
                    .orElse(null);
        }

        gameRuleEngine.validateAndPlayCard(state, playerId, card);

        if (isVettu && highestPlayedBeforeVettu != null) {
            Player vulnerablePlayer = state.getPlayer(highestPlayedBeforeVettu.playerId());
            Player currentTurnPlayer = state.getPlayer(playerId);
            String desc = String.format("%s broke suit (Vettu) playing %s! %s (highest active card %s) inherits the table pile.",
                    currentTurnPlayer.getName(), card, vulnerablePlayer.getName(), highestPlayedBeforeVettu.card());
            events.add(new GameEvent("VETTU", playerId, card, desc));
        } else {
            events.add(new GameEvent("PLAY", playerId, card, String.format("%s played %s", state.getPlayer(playerId).getName(), card)));
        }

        for (Player p : state.getPlayers()) {
            if (p.getHand().isEmpty() && p.hasGottenAway()) {
                boolean alreadyLogged = events.stream()
                        .anyMatch(ev -> "ESCAPE".equals(ev.eventType()) && p.getId().equals(ev.playerId()));
                if (!alreadyLogged) {
                    events.add(new GameEvent("ESCAPE", p.getId(), null, String.format("%s ran out of cards and successfully escaped!", p.getName())));
                }
            }
        }

        boolean vettuOccurred = state.getActiveRoundSuit() == null && !wasEmptyBefore;

        if (vettuOccurred) {
            return;
        }

        if (state.getTablePile().size() == 4) {
            resolveCompletedTrick(state, discardedHistory);
        } else {
            gameRuleEngine.advanceTurn(state, state.getPlayers());
        }
    }

    private void runBotTurnsIfApplicable(GameSession session, List<GameEvent> events) {
        GameState state = session.getGameState();
        List<Card> discardedHistory = session.getDiscardedHistory();

        while (!isGameOver(state)) {
            String currentTurnId = state.getCurrentTurnPlayerId();
            Player currentPlayer = state.getPlayer(currentTurnId);
            if (currentPlayer == null || !currentPlayer.isBot()) {
                break;
            }

            Card botCard = botService.calculateBotMove(state, currentPlayer, state.getPlayers(), discardedHistory);
            executePlayStep(state, discardedHistory, currentTurnId, botCard, events);
        }
    }

    private void resolveCompletedTrick(GameState state, List<Card> discardedHistory) {
        Suit activeSuit = state.getActiveRoundSuit();
        PlayedCard highestPlayed = state.getTablePile().stream()
                .filter(pc -> pc.card().suit() == activeSuit)
                .max(Comparator.comparingInt(pc -> pc.card().rank().getValue()))
                .orElseThrow(() -> new IllegalStateException("No card of active suit in completed trick"));

        state.setCurrentTurnPlayerId(highestPlayed.playerId());

        for (PlayedCard pc : state.getTablePile()) {
            discardedHistory.add(pc.card());
        }

        state.clearTablePile();
        state.setActiveRoundSuit(null);
    }

    private boolean isGameOver(GameState state) {
        long activePlayersCount = state.getPlayers().stream()
                .filter(p -> !p.hasGottenAway())
                .count();
        return activePlayersCount <= 1;
    }

    private GameViewDTO mapToView(GameState state, List<GameEvent> events) {
        Player human = state.getPlayers().stream()
                .filter(p -> !p.isBot())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No human player found"));

        List<PlayerHandSizeDTO> otherPlayers = state.getPlayers().stream()
                .filter(p -> p.isBot())
                .map(p -> new PlayerHandSizeDTO(p.getId(), p.getName(), p.getHand().size(), p.isBot(), p.hasGottenAway()))
                .toList();

        return new GameViewDTO(
                state.getTablePile(),
                state.getActiveRoundSuit(),
                state.getCurrentTurnPlayerId(),
                human.getHand(),
                otherPlayers,
                isGameOver(state),
                events
        );
    }
}
