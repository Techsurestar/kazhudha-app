package com.kazhudha.engine.service;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.GameState;
import com.kazhudha.engine.domain.PlayedCard;
import com.kazhudha.engine.domain.Player;
import com.kazhudha.engine.domain.Suit;
import com.kazhudha.engine.exception.BusinessException;

import java.util.List;
import java.util.Objects;

public class GameRuleEngine {

    public void validateAndPlayCard(GameState state, String playerId, Card card) {
        Objects.requireNonNull(state, "GameState cannot be null");
        Objects.requireNonNull(playerId, "Player ID cannot be null");
        Objects.requireNonNull(card, "Card cannot be null");

        if (!playerId.equals(state.getCurrentTurnPlayerId())) {
            throw new IllegalStateException("It is not player " + playerId + "'s turn");
        }

        Player player = state.getPlayer(playerId);
        if (player == null) {
            throw new IllegalArgumentException("Player not found in game state: " + playerId);
        }

        if (!player.getHand().contains(card)) {
            throw new IllegalArgumentException("Player does not have this card in hand: " + card);
        }

        boolean isVettu = false;
        if (state.getTablePile().isEmpty()) {
            state.setActiveRoundSuit(card.suit());
        } else {
            Suit activeSuit = state.getActiveRoundSuit();
            if (card.suit() != activeSuit) {
                boolean hasActiveSuit = player.getHand().stream()
                        .anyMatch(c -> c.suit() == activeSuit);
                if (hasActiveSuit) {
                    throw new BusinessException("Must follow active suit when available. Active suit: " + activeSuit);
                }
                isVettu = true;
            }
        }

        player.removeCard(card);
        state.addToTablePile(new PlayedCard(playerId, card));

        if (isVettu) {
            handleVettuCondition(state, state.getPlayers(), player, card);
        }

        updatePlayerSheddingStatus(state.getPlayers());
    }

    public void handleVettuCondition(GameState state, List<Player> players, Player currentTurnPlayer, Card playedCard) {
        Objects.requireNonNull(state, "GameState cannot be null");
        Objects.requireNonNull(players, "Players list cannot be null");
        Objects.requireNonNull(currentTurnPlayer, "Current turn player cannot be null");
        Objects.requireNonNull(playedCard, "Played card cannot be null");

        Suit activeSuit = state.getActiveRoundSuit();
        if (activeSuit == null) {
            throw new IllegalStateException("Active round suit cannot be null during Vettu resolution");
        }

        PlayedCard highestPlayedCard = state.getTablePile().stream()
                .filter(pc -> pc.card().suit() == activeSuit)
                .max((pc1, pc2) -> Integer.compare(pc1.card().rank().getValue(), pc2.card().rank().getValue()))
                .orElseThrow(() -> new IllegalStateException("No cards of the active suit found on the table pile during Vettu"));

        String penalizedPlayerId = highestPlayedCard.playerId();
        Player penalizedPlayer = players.stream()
                .filter(p -> p.getId().equals(penalizedPlayerId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Penalized player not found in players list: " + penalizedPlayerId));

        for (PlayedCard pc : state.getTablePile()) {
            penalizedPlayer.addCard(pc.card());
        }

        state.clearTablePile();
        state.setActiveRoundSuit(null);
        state.setCurrentTurnPlayerId(penalizedPlayerId);
    }

    public void updatePlayerSheddingStatus(List<Player> players) {
        Objects.requireNonNull(players, "Players list cannot be null");
        for (Player player : players) {
            if (player.getHand().isEmpty() && !player.hasGottenAway()) {
                player.setHasGottenAway(true);
            }
        }
    }

    public void advanceTurn(GameState state, List<Player> players) {
        Objects.requireNonNull(state, "GameState cannot be null");
        Objects.requireNonNull(players, "Players list cannot be null");
        if (players.isEmpty()) {
            throw new IllegalArgumentException("Players list cannot be empty");
        }

        String currentId = state.getCurrentTurnPlayerId();
        if (currentId == null) {
            throw new IllegalStateException("Current turn player ID is not set");
        }

        int currentIndex = -1;
        for (int i = 0; i < players.size(); i++) {
            if (players.get(i).getId().equals(currentId)) {
                currentIndex = i;
                break;
            }
        }

        if (currentIndex == -1) {
            throw new IllegalArgumentException("Current turn player is not in the provided players list");
        }

        int size = players.size();
        for (int i = 1; i <= size; i++) {
            int nextIndex = (currentIndex + i) % size;
            Player nextPlayer = players.get(nextIndex);
            if (!nextPlayer.hasGottenAway()) {
                state.setCurrentTurnPlayerId(nextPlayer.getId());
                return;
            }
        }

        throw new IllegalStateException("All players have gotten away; no valid next turn exists");
    }
}
