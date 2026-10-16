import type { GameState } from '../types/game-state.js';
import type { Player } from '../types/player.js';

export function advanceTurn(
  state: GameState,
  players: readonly Player[]
): void {
  if (!state) throw new Error('GameState cannot be null');
  if (!players || players.length === 0) {
    throw new Error('Players list cannot be empty');
  }

  const currentId = state.getCurrentTurnPlayerId();
  if (!currentId) {
    throw new Error('Current turn player ID is not set');
  }

  const currentIndex = players.findIndex((p) => p.getId() === currentId);
  if (currentIndex === -1) {
    throw new Error('Current turn player is not in the provided players list');
  }

  const size = players.length;
  for (let i = 1; i <= size; i++) {
    const nextIndex = (currentIndex + i) % size;
    const nextPlayer = players[nextIndex];
    if (!nextPlayer.hasGottenAway()) {
      state.setCurrentTurnPlayerId(nextPlayer.getId());
      return;
    }
  }

  throw new Error('All players have gotten away; no valid next turn exists');
}
