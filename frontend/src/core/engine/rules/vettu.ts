import type { Card, Suit } from '../types/card.js';
import type { GameState, PlayedCard } from '../types/game-state.js';
import type { Player } from '../types/player.js';
import { RANK_VALUES } from '../constants/ranks.js';

export function handleVettuCondition(
  state: GameState,
  players: readonly Player[],
  currentTurnPlayer: Player,
  playedCard: Card
): void {
  if (!state) throw new Error('GameState cannot be null');
  if (!players) throw new Error('Players list cannot be null');
  if (!currentTurnPlayer) throw new Error('Current turn player cannot be null');
  if (!playedCard) throw new Error('Played card cannot be null');

  const activeSuit = state.getActiveRoundSuit();
  if (!activeSuit) {
    throw new Error('Active round suit cannot be null during Vettu resolution');
  }

  const tablePile = state.getTablePile();
  const matchingCards = tablePile.filter((pc) => pc.card.suit === activeSuit);
  if (matchingCards.length === 0) {
    throw new Error('No cards of the active suit found on the table pile during Vettu');
  }

  let highestPlayedCard: PlayedCard = matchingCards[0];
  for (let i = 1; i < matchingCards.length; i++) {
    if (RANK_VALUES[matchingCards[i].card.rank] > RANK_VALUES[highestPlayedCard.card.rank]) {
      highestPlayedCard = matchingCards[i];
    }
  }

  const penalizedPlayerId = highestPlayedCard.playerId;
  const penalizedPlayer = players.find((p) => p.getId() === penalizedPlayerId);
  if (!penalizedPlayer) {
    throw new Error(`Penalized player not found in players list: ${penalizedPlayerId}`);
  }

  // currentTurnPlayer broke suit -> mark void
  const currentVoids = state.getPlayerSuitVoids().get(currentTurnPlayer.getId());
  if (currentVoids) {
    currentVoids.add(activeSuit);
  }

  // Penalized player inherits the pile -> remove void for all suits in pile
  const suitsInPile = new Set<Suit>(tablePile.map((pc) => pc.card.suit));
  const penalizedVoids = state.getPlayerSuitVoids().get(penalizedPlayer.getId());
  if (penalizedVoids) {
    for (const suit of suitsInPile) {
      penalizedVoids.delete(suit);
    }
  }

  // Add all cards from table pile to penalized player
  for (const pc of tablePile) {
    penalizedPlayer.addCard(pc.card);
  }

  penalizedPlayer.setHasGottenAway(false);
  const escapedIds = state.getEscapedPlayerIds();
  const escapedIndex = escapedIds.indexOf(penalizedPlayerId);
  if (escapedIndex !== -1) {
    escapedIds.splice(escapedIndex, 1);
  }

  state.clearTablePile();
  state.setActiveRoundSuit(null);
  state.setCurrentTurnPlayerId(penalizedPlayerId);
}
