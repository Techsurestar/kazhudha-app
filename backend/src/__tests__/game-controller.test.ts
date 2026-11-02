import { describe, it, expect } from 'vitest';
import { GameController } from '../controllers/game.controller.js';
import { Player, GameState } from '@kazhudha/shared';
import { GameSessionManager } from '../services/session-manager.js';

describe('GameController', () => {
  it('should start a game and return GameViewDTO', () => {
    const controller = new GameController();
    const view = controller.startGame('test-session-1');

    expect(view).toBeDefined();
    expect(view.humanHand.length).toBeGreaterThan(0);
    expect(view.otherPlayers.length).toBe(3);
    expect(view.currentTurnPlayerId).toBeDefined();
    expect(view.gameOver).toBe(false);
  });

  it('should execute human play step following active suit rules', () => {
    const controller = new GameController();
    const view = controller.startGame('test-session-2');

    if (view.currentTurnPlayerId === 'human' && !view.gameOver) {
      const activeSuit = view.activeRoundSuit;
      // Must follow suit if active suit is present and player has it
      const validCard =
        (activeSuit && view.humanHand.find((c) => c.suit === activeSuit)) ||
        view.humanHand[0];

      const initialHandSize = view.humanHand.length;
      const nextView = controller.playCard('test-session-2', {
        playerId: 'human',
        card: validCard,
      });

      expect(nextView).toBeDefined();
      expect(nextView.humanHand.length).toBeLessThan(initialHandSize);
    }
  });

  it('should not end trick prematurely when a middle bot sheds its last card, yielding turn to human', () => {
    const sessionManager = new GameSessionManager();
    const controller = new GameController(undefined, undefined, undefined, sessionManager);

    // Setup 4 players in order: bot1 -> bot2 -> bot3 -> human
    const bot1 = new Player('bot1', 'Bot 1', true);
    const bot2 = new Player('bot2', 'Bot 2', true);
    const bot3 = new Player('bot3', 'Bot 3', true);
    const human = new Player('human', 'Human', false);

    bot1.addCard({ suit: 'SPADES', rank: 'ACE' });
    bot1.addCard({ suit: 'SPADES', rank: 'KING' });

    // bot2 has ONLY 1 card (their last card!)
    bot2.addCard({ suit: 'SPADES', rank: 'SEVEN' });

    bot3.addCard({ suit: 'SPADES', rank: 'FOUR' });
    bot3.addCard({ suit: 'SPADES', rank: 'FIVE' });

    human.addCard({ suit: 'SPADES', rank: 'TWO' });
    human.addCard({ suit: 'SPADES', rank: 'THREE' });

    const players = [human, bot1, bot2, bot3];
    const state = new GameState(players);
    // bot1 leads
    state.setCurrentTurnPlayerId('bot1');

    const session = sessionManager.createSession('mid-trick-shed-test', state, players);

    const events: any[] = [];
    (controller as any).runBotTurnsIfApplicable(session, events);

    const view = (controller as any).mapToView(session, events);

    // CRITICAL: Must be human's turn!
    expect(view.currentTurnPlayerId).toBe('human');
    // Table pile must have 3 cards waiting for human
    expect(view.tablePile.length).toBe(3);
    expect(bot2.getHand().length).toBe(0);
    expect(bot2.hasGottenAway()).toBe(true);

    // Human plays their 2 of Spades
    const nextView = controller.playCard('mid-trick-shed-test', {
      playerId: 'human',
      card: { suit: 'SPADES', rank: 'TWO' },
    });

    // The completed trick with 4 cards was resolved.
    // Since Bot1 won the trick, Bot1 led the next trick and Bot3 followed,
    // bringing the turn back to human for the next round!
    expect(nextView.currentTurnPlayerId).toBe('human');
    expect(nextView.tablePile.length).toBe(2); // Bot1 lead + Bot3 follow in next trick
  });

  it('should ensure 4th player plays when human in 3rd seat sheds their last card', () => {
    const sessionManager = new GameSessionManager();
    const controller = new GameController(undefined, undefined, undefined, sessionManager);

    // Order: human (0) -> bot1 (1) -> bot2 (2) -> bot3 (3)
    // Trick order: bot1 (P1) -> bot2 (P2) -> human (P3) -> bot3 (P4)
    const human = new Player('human', 'Human', false);
    const bot1 = new Player('bot1', 'Bot 1', true);
    const bot2 = new Player('bot2', 'Bot 2', true);
    const bot3 = new Player('bot3', 'Bot 3', true);

    bot1.addCard({ suit: 'SPADES', rank: 'ACE' });
    bot1.addCard({ suit: 'SPADES', rank: 'KING' });

    bot2.addCard({ suit: 'SPADES', rank: 'SEVEN' });
    bot2.addCard({ suit: 'SPADES', rank: 'EIGHT' });

    // Human has ONLY 1 card (4 of Spades)
    human.addCard({ suit: 'SPADES', rank: 'FOUR' });

    bot3.addCard({ suit: 'SPADES', rank: 'FIVE' });
    bot3.addCard({ suit: 'SPADES', rank: 'SIX' });

    const players = [human, bot1, bot2, bot3];
    const state = new GameState(players);
    // bot2 leads so trick order is: bot2 (1st) -> bot3 (2nd) -> human (3rd) -> bot1 (4th)
    state.setCurrentTurnPlayerId('bot2');

    const session = sessionManager.createSession('human-3rd-shed-test', state, players);

    // 1. bot1 leads A of Spades, bot2 plays 7 of Spades
    // Then turn stops at human!
    (controller as any).runBotTurnsIfApplicable(session, []);

    const view = (controller as any).mapToView(session, []);
    expect(view.currentTurnPlayerId).toBe('human');
    expect(view.tablePile.length).toBe(2);

    // 2. Human plays 4 of Spades (their LAST card!)
    const nextView = controller.playCard('human-3rd-shed-test', {
      playerId: 'human',
      card: { suit: 'SPADES', rank: 'FOUR' },
    });

    // Verify events:
    // 1. Human plays 4 of Spades
    // 2. Human escapes
    // 3. Bot1 (4th seat) MUST play in this trick before it resolves!
    const playEvents = nextView.events.filter(e => e.eventType === 'PLAY');
    const firstBotAfterHuman = playEvents.find(e => e.playerId === 'bot1');
    expect(firstBotAfterHuman).toBeDefined();
    expect(firstBotAfterHuman?.description).toContain('Bot 1 played');
  });
});
