import { describe, it, expect } from 'vitest';
import { GameController } from '../controllers/game.controller.js';

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
});
