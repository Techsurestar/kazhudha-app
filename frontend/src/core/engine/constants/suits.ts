import type { Suit } from '../types/card.js';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  SPADES: '♠',
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
};

export const SUIT_ORDER: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];

export const ALL_SUITS: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
