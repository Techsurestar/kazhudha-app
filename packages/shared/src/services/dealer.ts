import type { Card } from '../types/card.js';
import { handContains } from '../types/card.js';
import type { Player } from '../types/player.js';
import { ALL_SUITS } from '../constants/suits.js';
import { ALL_RANKS } from '../constants/ranks.js';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }
}

export function shuffleAndDeal(players: readonly Player[]): void {
  if (!players) throw new Error('Players list cannot be null');
  if (players.length !== 4) {
    throw new Error('The game requires exactly 4 players');
  }

  const deck = createDeck();
  shuffleDeck(deck);

  for (const player of players) {
    player.clearHand();
  }

  for (let i = 0; i < deck.length; i++) {
    const player = players[i % 4];
    player.addCard(deck[i]);
  }
}

export function determineStartingPlayer(players: readonly Player[]): string {
  if (!players) throw new Error('Players list cannot be null');
  const aceOfSpades: Card = { suit: 'SPADES', rank: 'ACE' };

  const starter = players.find((p) => handContains(p.getHand(), aceOfSpades));
  if (!starter) {
    throw new Error('Ace of Spades was not found in any player hand');
  }
  return starter.getId();
}

export class DealerService {
  public createDeck(): Card[] {
    return createDeck();
  }

  public shuffleAndDeal(players: readonly Player[]): void {
    shuffleAndDeal(players);
  }

  public determineStartingPlayer(players: readonly Player[]): string {
    return determineStartingPlayer(players);
  }
}
