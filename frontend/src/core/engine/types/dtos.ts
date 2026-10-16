import type { Card, Suit } from './card.js';
import type { GameEvent, PlayedCard } from './game-state.js';
import type { HandResult } from './hand-result.js';

export interface PlayerHandSizeDTO {
  id: string;
  name: string;
  handSize: number;
  isBot: boolean;
  hasGottenAway: boolean;
}

export interface PlayRequest {
  playerId: string;
  card: Card;
}

export interface GameViewDTO {
  tablePile: PlayedCard[];
  activeRoundSuit: Suit | null;
  currentTurnPlayerId: string;
  humanHand: Card[];
  otherPlayers: PlayerHandSizeDTO[];
  gameOver: boolean;
  kazhudhaPlayerId: string | null;
  events: GameEvent[];
  hands: HandResult[];
  tournamentOver: boolean;
}
