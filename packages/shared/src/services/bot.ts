import type { Card, Suit } from '../types/card.js';
import { handContains } from '../types/card.js';
import type { GameState, PlayedCard } from '../types/game-state.js';
import type { Player } from '../types/player.js';
import { ALL_RANKS, RANK_VALUES } from '../constants/ranks.js';

export function isHighestRemainingOfSuit(
  card: Card,
  hand: readonly Card[],
  discardedHistory: readonly Card[]
): boolean {
  const cardValue = RANK_VALUES[card.rank];
  for (const rank of ALL_RANKS) {
    if (RANK_VALUES[rank] > cardValue) {
      const higherCard: Card = { suit: card.suit, rank };
      if (
        !handContains(hand, higherCard) &&
        !handContains(discardedHistory, higherCard)
      ) {
        return false;
      }
    }
  }
  return true;
}

export function getNextActivePlayer(
  currentPlayer: Player,
  allPlayers: readonly Player[]
): Player | null {
  const currentIndex = allPlayers.findIndex(
    (p) => p.getId() === currentPlayer.getId()
  );
  if (currentIndex === -1) return null;

  const size = allPlayers.length;
  for (let i = 1; i < size; i++) {
    const nextIndex = (currentIndex + i) % size;
    const nextPlayer = allPlayers[nextIndex];
    if (!nextPlayer.hasGottenAway()) {
      return nextPlayer;
    }
  }
  return null;
}

export function chooseLeadCard(
  state: GameState,
  botPlayer: Player,
  allPlayers: readonly Player[],
  discardedHistory: readonly Card[]
): Card {
  const hand = botPlayer.getHand();
  let cardsToConsider = [...hand];

  const nextPlayer = getNextActivePlayer(botPlayer, allPlayers);
  if (nextPlayer) {
    const voids = state.getPlayerSuitVoids().get(nextPlayer.getId());
    if (voids && voids.size > 0) {
      const suitsInHand = new Set<Suit>(hand.map((c) => c.suit));
      if (suitsInHand.size > 1) {
        const nonVoidCards = hand.filter((c) => !voids.has(c.suit));
        if (nonVoidCards.length > 0) {
          cardsToConsider = nonVoidCards;
        }
      }
    }
  }

  const groupedBySuit = new Map<Suit, Card[]>();
  for (const card of cardsToConsider) {
    const group = groupedBySuit.get(card.suit) ?? [];
    group.push(card);
    groupedBySuit.set(card.suit, group);
  }

  const safeCards = cardsToConsider.filter((c) => {
    const group = groupedBySuit.get(c.suit);
    const isSingleton = group && group.length === 1;
    const isHighRank = RANK_VALUES[c.rank] > 10;
    return !(isSingleton && isHighRank);
  });

  const candidates = safeCards.length === 0 ? cardsToConsider : safeCards;

  const nonWeaponCandidates = candidates.filter(
    (c) => !isHighestRemainingOfSuit(c, hand, discardedHistory)
  );

  const finalCandidates =
    nonWeaponCandidates.length === 0 ? candidates : nonWeaponCandidates;

  if (hand.length <= 3) {
    // Endgame panic: play highest card
    return finalCandidates.reduce((max, c) =>
      RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
    );
  } else {
    // Normal lead: play lowest card
    return finalCandidates.reduce((min, c) =>
      RANK_VALUES[c.rank] < RANK_VALUES[min.rank] ? c : min
    );
  }
}

export function calculateBotMove(
  state: GameState,
  botPlayer: Player,
  allPlayers: readonly Player[],
  discardedHistory: readonly Card[]
): Card {
  if (!state) throw new Error('GameState cannot be null');
  if (!botPlayer) throw new Error('Player cannot be null');
  if (!allPlayers) throw new Error('All players list cannot be null');
  if (!discardedHistory) throw new Error('Discarded history cannot be null');

  const hand = botPlayer.getHand();
  if (hand.length === 0) {
    throw new Error('Bot hand is empty, cannot calculate move');
  }

  if (state.getTablePile().length === 0) {
    return chooseLeadCard(state, botPlayer, allPlayers, discardedHistory);
  }

  const activeSuit = state.getActiveRoundSuit();
  if (!activeSuit) {
    throw new Error('Active round suit cannot be null when table pile is not empty');
  }

  const matchingCards = hand.filter((c) => c.suit === activeSuit);
  if (matchingCards.length > 0) {
    // Must follow suit: play lowest
    return matchingCards.reduce((min, c) =>
      RANK_VALUES[c.rank] < RANK_VALUES[min.rank] ? c : min
    );
  }

  // Cannot follow suit -> Vettu cut!
  const tablePile = state.getTablePile();
  const activeSuitPlayed = tablePile.filter(
    (pc) => pc.card.suit === activeSuit
  );

  let highestActivePlayed: PlayedCard | null = null;
  if (activeSuitPlayed.length > 0) {
    highestActivePlayed = activeSuitPlayed.reduce((max, pc) =>
      RANK_VALUES[pc.card.rank] > RANK_VALUES[max.card.rank] ? pc : max
    );
  }

  let targetRevengeMode = false;
  if (highestActivePlayed) {
    const vulnerablePlayerId = highestActivePlayed.playerId;
    const vulnerablePlayer = allPlayers.find(
      (p) => p.getId() === vulnerablePlayerId
    );
    if (vulnerablePlayer && vulnerablePlayer.getHand().length <= 3) {
      targetRevengeMode = true;
    }
  }

  if (targetRevengeMode) {
    // Dump highest card to penalize vulnerable player heavily
    return hand.reduce((max, c) =>
      RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
    );
  }

  const groupedBySuit = new Map<Suit, Card[]>();
  for (const card of hand) {
    const group = groupedBySuit.get(card.suit) ?? [];
    group.push(card);
    groupedBySuit.set(card.suit, group);
  }

  const singletons: Card[] = [];
  const nonSingletons: Card[] = [];
  for (const group of groupedBySuit.values()) {
    if (group.length === 1) {
      singletons.push(...group);
    } else {
      nonSingletons.push(...group);
    }
  }

  if (singletons.length === 0) {
    return hand.reduce((max, c) =>
      RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
    );
  }

  const probability = Math.random();
  if (probability < 0.7) {
    // 70%: shed highest singleton
    return singletons.reduce((max, c) =>
      RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
    );
  } else {
    // 30%: dump highest non-singleton if available, else highest singleton
    if (nonSingletons.length > 0) {
      return nonSingletons.reduce((max, c) =>
        RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
      );
    }
    return singletons.reduce((max, c) =>
      RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
    );
  }
}

export class BotService {
  public calculateBotMove(
    state: GameState,
    botPlayer: Player,
    allPlayers: readonly Player[],
    discardedHistory: readonly Card[]
  ): Card {
    return calculateBotMove(state, botPlayer, allPlayers, discardedHistory);
  }
}
