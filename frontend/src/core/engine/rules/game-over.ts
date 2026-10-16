import type { GameState } from '../types/game-state.js';

export function isGameOver(state: GameState): boolean {
  const activePlayersCount = state
    .getPlayers()
    .filter((p) => !p.hasGottenAway()).length;
  return activePlayersCount <= 1;
}
