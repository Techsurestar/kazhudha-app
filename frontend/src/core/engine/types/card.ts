export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export type Rank =
  | 'TWO'
  | 'THREE'
  | 'FOUR'
  | 'FIVE'
  | 'SIX'
  | 'SEVEN'
  | 'EIGHT'
  | 'NINE'
  | 'TEN'
  | 'JACK'
  | 'QUEEN'
  | 'KING'
  | 'ACE';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export function cardEquals(a: Card | null | undefined, b: Card | null | undefined): boolean {
  if (!a || !b) return false;
  return a.suit === b.suit && a.rank === b.rank;
}

export function handContains(hand: readonly Card[], card: Card): boolean {
  return hand.some((c) => cardEquals(c, card));
}

export function findCardIndex(hand: readonly Card[], card: Card): number {
  return hand.findIndex((c) => cardEquals(c, card));
}
