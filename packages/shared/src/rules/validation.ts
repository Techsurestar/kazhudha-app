import type { Card, Suit } from '../types/card.js';
import { handContains } from '../types/card.js';
import type { GameState } from '../types/game-state.js';
import { BusinessException } from '../errors/game-errors.js';
import { handleVettuCondition } from './vettu.js';
import { updatePlayerSheddingStatus } from './escape.js';

export function validateAndPlayCard(
  state: GameState,
  playerId: string,
  card: Card
): { isVettu: boolean } {
  if (!state) throw new Error('GameState cannot be null');
  if (!playerId) throw new Error('Player ID cannot be null');
  if (!card) throw new Error('Card cannot be null');

  if (playerId !== state.getCurrentTurnPlayerId()) {
    throw new Error(`It is not player ${playerId}'s turn`);
  }

  const player = state.getPlayer(playerId);
  if (!player) {
    throw new Error(`Player not found in game state: ${playerId}`);
  }

  if (!handContains(player.getHand(), card)) {
    throw new Error(`Player does not have this card in hand: ${JSON.stringify(card)}`);
  }

  let isVettu = false;
  if (state.getTablePile().length === 0) {
    state.setActiveRoundSuit(card.suit);
  } else {
    const activeSuit = state.getActiveRoundSuit();
    if (card.suit !== activeSuit) {
      const hasActiveSuit = player
        .getHand()
        .some((c) => c.suit === activeSuit);
      if (hasActiveSuit) {
        throw new BusinessException(
          `Must follow active suit when available. Active suit: ${activeSuit}`
        );
      }
      isVettu = true;
    }
  }

  player.removeCard(card);
  state.addToTablePile({ playerId, card });

  if (isVettu) {
    handleVettuCondition(state, state.getPlayers(), player, card);
  }

  updatePlayerSheddingStatus(state, state.getPlayers());

  return { isVettu };
}
