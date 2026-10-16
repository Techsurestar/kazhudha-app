import type { GameState } from '../types/game-state.js';
import type { Player } from '../types/player.js';

export function updatePlayerSheddingStatus(
  state: GameState,
  players: readonly Player[]
): void {
  if (!state) throw new Error('GameState cannot be null');
  if (!players) throw new Error('Players list cannot be null');

  for (const player of players) {
    if (player.getHand().length === 0 && !player.hasGottenAway()) {
      player.setHasGottenAway(true);
      const escaped = state.getEscapedPlayerIds();
      if (!escaped.includes(player.getId())) {
        escaped.push(player.getId());
      }
    }
  }
}
