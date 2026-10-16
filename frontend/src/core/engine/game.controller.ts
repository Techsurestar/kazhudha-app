import type {
  Card,
  GameEvent,
  GameViewDTO,
  PlayerHandSizeDTO,
  PlayRequest,
  PlayedCard,
  Suit,
} from './index.js';
import {
  Player,
  GameState,
  DealerService,
  GameRuleEngine,
  BotService,
  InvalidMoveException,
  SessionNotFoundException,
  RANK_VALUES,
  isGameOver,
} from './index.js';
import { GameSession, GameSessionManager } from './session-manager.js';

function cardToString(card: Card): string {
  return `${card.rank} of ${card.suit}`;
}

export class GameController {
  private readonly dealerService: DealerService;
  private readonly gameRuleEngine: GameRuleEngine;
  private readonly botService: BotService;
  private readonly sessionManager: GameSessionManager;

  constructor(
    dealerService?: DealerService,
    gameRuleEngine?: GameRuleEngine,
    botService?: BotService,
    sessionManager?: GameSessionManager
  ) {
    this.dealerService = dealerService ?? new DealerService();
    this.gameRuleEngine = gameRuleEngine ?? new GameRuleEngine();
    this.botService = botService ?? new BotService();
    this.sessionManager = sessionManager ?? new GameSessionManager();
  }

  public startGame(sessionId = 'default'): GameViewDTO {
    let session: GameSession | null = null;
    let hasExisting = false;

    try {
      session = this.sessionManager.getSession(sessionId);
      hasExisting = true;
    } catch (e) {
      if (e instanceof SessionNotFoundException) {
        session = null;
      } else {
        throw e;
      }
    }

    if (hasExisting && session && !session.isTournamentOver()) {
      session.resetForNextHand(this.dealerService);
      const executionEvents: GameEvent[] = [];
      this.runBotTurnsIfApplicable(session, executionEvents);
      return this.mapToView(session, executionEvents);
    }

    const p1 = new Player('human', 'Player 1 (You)', false);
    const p2 = new Player('bot1', 'Bot 1', true);
    const p3 = new Player('bot2', 'Bot 2', true);
    const p4 = new Player('bot3', 'Bot 3', true);

    const players = [p1, p2, p3, p4];
    this.dealerService.shuffleAndDeal(players);
    const startingPlayerId = this.dealerService.determineStartingPlayer(players);

    const state = new GameState(players);
    state.setCurrentTurnPlayerId(startingPlayerId);

    session = this.sessionManager.createSession(sessionId, state, players);

    const executionEvents: GameEvent[] = [];
    this.runBotTurnsIfApplicable(session, executionEvents);
    return this.mapToView(session, executionEvents);
  }

  public playCard(sessionId: string, request: PlayRequest): GameViewDTO {
    let session: GameSession;
    try {
      session = this.sessionManager.getSession(sessionId);
    } catch (e) {
      if (e instanceof SessionNotFoundException) {
        throw new InvalidMoveException('Session not found. Please start a new game.');
      }
      throw e;
    }

    const state = session.getGameState();
    const discardedHistory = session.getDiscardedHistory();

    if (isGameOver(state)) {
      throw new InvalidMoveException('The game is already over.');
    }

    const executionEvents: GameEvent[] = [];

    const symbolMap: Record<string, Suit> = {
      '♠': 'SPADES',
      '♥': 'HEARTS',
      '♦': 'DIAMONDS',
      '♣': 'CLUBS',
    };
    const suit = (symbolMap[request.card.suit] || request.card.suit) as Suit;
    const card: Card = { ...request.card, suit };

    try {
      this.executePlayStep(
        state,
        discardedHistory,
        request.playerId,
        card,
        executionEvents
      );
      this.runBotTurnsIfApplicable(session, executionEvents);

      if (isGameOver(state)) {
        session.recordCurrentHand();
      } else {
        this.sessionManager.updateSession(sessionId, session);
      }
    } catch (e: any) {
      throw new InvalidMoveException(e.message);
    }

    return this.mapToView(session, executionEvents);
  }

  private executePlayStep(
    state: GameState,
    discardedHistory: Card[],
    playerId: string,
    card: Card,
    events: GameEvent[]
  ): void {
    const wasEmptyBefore = state.getTablePile().length === 0;
    const activeSuit = state.getActiveRoundSuit();
    let isVettu = false;

    if (!wasEmptyBefore && card.suit !== activeSuit) {
      const player = state.getPlayer(playerId);
      const hasActiveSuit = player
        ?.getHand()
        .some((c) => c.suit === activeSuit);
      if (!hasActiveSuit) {
        isVettu = true;
      }
    }

    let highestPlayedBeforeVettu: PlayedCard | null = null;
    if (isVettu && activeSuit) {
      const matching = state
        .getTablePile()
        .filter((pc) => pc.card.suit === activeSuit);
      if (matching.length > 0) {
        highestPlayedBeforeVettu = matching.reduce((max, pc) =>
          RANK_VALUES[pc.card.rank] > RANK_VALUES[max.card.rank] ? pc : max
        );
      }
    }

    this.gameRuleEngine.validateAndPlayCard(state, playerId, card);

    const currentPlayer = state.getPlayer(playerId);
    const playerName = currentPlayer ? currentPlayer.getName() : playerId;

    if (isVettu && highestPlayedBeforeVettu) {
      const vulnerablePlayer = state.getPlayer(
        highestPlayedBeforeVettu.playerId
      );
      const vulnName = vulnerablePlayer
        ? vulnerablePlayer.getName()
        : highestPlayedBeforeVettu.playerId;
      const desc = `${playerName} broke suit (Vettu) playing ${cardToString(
        card
      )}! ${vulnName} (highest active card ${cardToString(
        highestPlayedBeforeVettu.card
      )}) inherits the table pile.`;
      events.push({
        eventType: 'VETTU',
        playerId,
        card,
        description: desc,
      });
    } else {
      events.push({
        eventType: 'PLAY',
        playerId,
        card,
        description: `${playerName} played ${cardToString(card)}`,
      });
    }

    for (const p of state.getPlayers()) {
      if (p.getHand().length === 0 && p.hasGottenAway()) {
        const alreadyLogged = events.some(
          (ev) => ev.eventType === 'ESCAPE' && ev.playerId === p.getId()
        );
        if (!alreadyLogged) {
          events.push({
            eventType: 'ESCAPE',
            playerId: p.getId(),
            card: null,
            description: `${p.getName()} ran out of cards and successfully escaped!`,
          });
        }
      }
    }

    const vettuOccurred =
      state.getActiveRoundSuit() === null && !wasEmptyBefore;
    if (vettuOccurred) {
      return;
    }

    const activePlayersCount = state
      .getPlayers()
      .filter((p) => !p.hasGottenAway()).length;

    if (state.getTablePile().length === activePlayersCount) {
      this.resolveCompletedTrick(state, discardedHistory);
    } else {
      this.gameRuleEngine.advanceTurn(state, state.getPlayers());
    }
  }

  private runBotTurnsIfApplicable(
    session: GameSession,
    events: GameEvent[]
  ): void {
    const state = session.getGameState();
    const discardedHistory = session.getDiscardedHistory();

    while (!isGameOver(state)) {
      const currentTurnId = state.getCurrentTurnPlayerId();
      if (!currentTurnId) break;

      const currentPlayer = state.getPlayer(currentTurnId);
      if (!currentPlayer || !currentPlayer.isBot) break;

      const botCard = this.botService.calculateBotMove(
        state,
        currentPlayer,
        state.getPlayers(),
        discardedHistory
      );
      this.executePlayStep(
        state,
        discardedHistory,
        currentTurnId,
        botCard,
        events
      );
    }
  }

  private resolveCompletedTrick(
    state: GameState,
    discardedHistory: Card[]
  ): void {
    const activeSuit = state.getActiveRoundSuit();
    if (!activeSuit) {
      throw new Error('No active suit in completed trick');
    }

    const matching = state
      .getTablePile()
      .filter((pc) => pc.card.suit === activeSuit);
    if (matching.length === 0) {
      throw new Error('No card of active suit in completed trick');
    }

    const highestPlayed = matching.reduce((max, pc) =>
      RANK_VALUES[pc.card.rank] > RANK_VALUES[max.card.rank] ? pc : max
    );

    const highestPlayedPlayer = state.getPlayer(highestPlayed.playerId);
    if (highestPlayedPlayer && highestPlayedPlayer.hasGottenAway()) {
      state.setCurrentTurnPlayerId(highestPlayed.playerId);
      this.gameRuleEngine.advanceTurn(state, state.getPlayers());
    } else {
      state.setCurrentTurnPlayerId(highestPlayed.playerId);
    }

    for (const pc of state.getTablePile()) {
      discardedHistory.push(pc.card);
    }

    state.clearTablePile();
    state.setActiveRoundSuit(null);
  }

  private mapToView(
    session: GameSession,
    events: GameEvent[]
  ): GameViewDTO {
    const state = session.getGameState();
    const human = state.getPlayers().find((p) => !p.isBot);
    if (!human) {
      throw new Error('No human player found');
    }

    const otherPlayers: PlayerHandSizeDTO[] = state
      .getPlayers()
      .filter((p) => p.isBot)
      .map((p) => ({
        id: p.getId(),
        name: p.getName(),
        handSize: p.getHand().length,
        isBot: p.isBot,
        hasGottenAway: p.hasGottenAway(),
      }));

    const gameOver = isGameOver(state);
    let kazhudhaPlayerId: string | null = null;
    if (gameOver) {
      const loser = state.getPlayers().find((p) => !p.hasGottenAway());
      kazhudhaPlayerId = loser ? loser.getId() : null;
    }

    return {
      tablePile: [...state.getTablePile()],
      activeRoundSuit: state.getActiveRoundSuit(),
      currentTurnPlayerId: state.getCurrentTurnPlayerId() ?? '',
      humanHand: [...human.getHand()],
      otherPlayers,
      gameOver,
      kazhudhaPlayerId,
      events,
      hands: [...session.getHands()],
      tournamentOver: session.isTournamentOver(),
    };
  }
}
