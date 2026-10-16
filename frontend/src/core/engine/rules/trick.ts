import type { Card } from '../types/card.js';
import type { GameState, PlayedCard } from '../types/game-state.js';
import type { Player } from '../types/player.js';
import { RANK_VALUES } from '../constants/ranks.js';
import { advanceTurn } from './turn.js';

export function resolveCompletedTrick(
  state: GameState,
  discardedHistory: Card[],
  players?: readonly Player[]
): void {
  const activeSuit = state.getActiveRoundSuit();
  if (!activeSuit) {
    throw new Error('No active round suit in completed trick');
  }

  const tablePile = state.getTablePile();
  const matchingCards = tablePile.filter((pc) => pc.card.suit === activeSuit);
  if (matchingCards.length === 0) {
    throw new Error('No card of active suit in completed trick');
  }

  let highestPlayed: PlayedCard = matchingCards[0];
  for (let i = 1; i < matchingCards.length; i++) {
    if (RANK_VALUES[matchingCards[i].card.rank] > RANK_VALUES[highestPlayed.card.rank]) {
      highestPlayed = matchingCards[i];
    }
  }

  const highestPlayedPlayer = state.getPlayer(highestPlayed.playerId);
  if (highestPlayedPlayer && highestPlayedPlayer.hasGottenAway()) {
    state.setCurrentTurnPlayerId(highestPlayed.playerId);
    advanceTurn(state, players ?? state.getPlayers());
  } else {
    state.setCurrentTurnPlayerId(highestPlayed.playerId);
  }

  for (const pc of tablePile) {
    discardedHistory.push(pc.card);
  }

  state.clearTablePile();
  state.setActiveRoundSuit(null);
}
