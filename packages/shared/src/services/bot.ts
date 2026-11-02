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

export function getUpcomingActivePlayers(
  currentPlayer: Player,
  allPlayers: readonly Player[]
): Player[] {
  const currentIndex = allPlayers.findIndex(
    (p) => p.getId() === currentPlayer.getId()
  );
  if (currentIndex === -1) return [];

  const upcoming: Player[] = [];
  const size = allPlayers.length;
  for (let i = 1; i < size; i++) {
    const nextIndex = (currentIndex + i) % size;
    const nextPlayer = allPlayers[nextIndex];
    if (!nextPlayer.hasGottenAway()) {
      upcoming.push(nextPlayer);
    }
  }
  return upcoming;
}

export function getNextActivePlayer(
  currentPlayer: Player,
  allPlayers: readonly Player[]
): Player | null {
  const upcoming = getUpcomingActivePlayers(currentPlayer, allPlayers);
  return upcoming.length > 0 ? upcoming[0] : null;
}

// ============================================================================
// Bot Personalities
// ============================================================================

export type BotPersonalityType = 'sofia' | 'leo' | 'jenny' | 'default';

export interface BotPersonality {
  name: string;
  type: BotPersonalityType;
  /** Maximum card rank considered safe for setting up a cut trap (e.g. 7 for Sofia/Jenny, 8 for Leo) */
  trapMaxRank: number;
  /** Hand size threshold that triggers endgame panic mode (e.g. 3 for Sofia/Jenny, 4 for Leo) */
  panicThreshold: number;
  /** Probability of attempting an aggressive trick takeover when holding an overcard */
  overtakeAggressiveness: number;
  /** Probability of strictly shedding singletons during Vettu vs dumping heavy cards */
  singletonShedRate: number;
}

export const SOFIA_PERSONALITY: BotPersonality = {
  name: 'Sofia',
  type: 'sofia',
  trapMaxRank: 7,              // Strict about trap safety (only ranks 2-7)
  panicThreshold: 3,           // Disciplined endgame panic at <= 3 cards
  overtakeAggressiveness: 0.0, // Cold tactician: never risks unnecessary trick takeover
  singletonShedRate: 0.95,     // 95% strictly creates voids by shedding singletons
};

export const LEO_PERSONALITY: BotPersonality = {
  name: 'Leo',
  type: 'leo',
  trapMaxRank: 8,              // Bolder traps: will try cut traps up to rank 8
  panicThreshold: 4,           // Panics/attacks earlier: triggers endgame panic at <= 4 cards
  overtakeAggressiveness: 0.70,// Aggressive gambler: seizes tricks with overcards to capture lead
  singletonShedRate: 0.50,     // 50% dumps highest card in entire hand to brutally punish opponent
};

export const JENNY_PERSONALITY: BotPersonality = {
  name: 'Jenny',
  type: 'jenny',
  trapMaxRank: 7,              // Standard textbook trap limit (rank <= 7)
  panicThreshold: 3,           // Standard panic threshold (<= 3 cards)
  overtakeAggressiveness: 0.0, // Pragmatic: disciplined ducking, takes tricks in panic mode
  singletonShedRate: 0.75,     // Balanced 75% singleton void creation
};

export const BOT_CHARACTERS = ['Jenny', 'Leo', 'Sofia'] as const;

export function shuffleBotSeats(
  characters: readonly string[] = BOT_CHARACTERS
): string[] {
  const shuffled = [...characters];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function resolveBotPersonality(
  botPlayer: Player,
  explicitPersonality?: BotPersonalityType | BotPersonality
): BotPersonality {
  if (typeof explicitPersonality === 'object' && explicitPersonality !== null) {
    return explicitPersonality;
  }
  if (typeof explicitPersonality === 'string') {
    switch (explicitPersonality.toLowerCase()) {
      case 'sofia': return SOFIA_PERSONALITY;
      case 'leo': return LEO_PERSONALITY;
      case 'jenny': return JENNY_PERSONALITY;
      default: return JENNY_PERSONALITY;
    }
  }

  const name = (botPlayer.getName() || '').toLowerCase();
  const id = (botPlayer.getId() || '').toLowerCase();

  if (name.includes('sofia') || id === 'bot3') return SOFIA_PERSONALITY;
  if (name.includes('leo') || id === 'bot2') return LEO_PERSONALITY;
  if (name.includes('jenny') || id === 'bot1') return JENNY_PERSONALITY;

  return JENNY_PERSONALITY;
}

export interface CutTrapOption {
  card: Card;
  targetPlayer: Player;
  cutterPlayer: Player;
  isVulnerableTarget: boolean;
}

/**
 * Searches for a tactical "Cut Trap" lead opportunity (Weaponizing Opponents' Voids).
 * If an intermediate opponent (target) must follow suit before a known void opponent (cutter) cuts,
 * leading a low card forces the target to play higher, causing them to absorb the Vettu penalty
 * when the cutter strikes.
 */
export function findCutTrapLead(
  state: GameState,
  botPlayer: Player,
  allPlayers: readonly Player[],
  discardedHistory: readonly Card[],
  personality?: BotPersonalityType | BotPersonality
): CutTrapOption | null {
  const profile = resolveBotPersonality(botPlayer, personality);
  const hand = botPlayer.getHand();
  const upcomingPlayers = getUpcomingActivePlayers(botPlayer, allPlayers);

  // We need at least 2 upcoming players: at least one intermediate target and one cutter
  if (upcomingPlayers.length < 2) return null;

  const trapOptions: CutTrapOption[] = [];

  for (const card of hand) {
    // Only low cards (rank value <= profile.trapMaxRank) are safe traps.
    // Leading beyond trapMaxRank risks the target ducking or having only lower cards, dumping penalty on the bot.
    if (RANK_VALUES[card.rank] > profile.trapMaxRank) continue;

    // Never use weapon cards (highest remaining in suit) as a trap
    if (isHighestRemainingOfSuit(card, hand, discardedHistory)) continue;

    const suit = card.suit;
    const firstCutterIndex = upcomingPlayers.findIndex((p) => {
      const voids = state.getPlayerSuitVoids().get(p.getId());
      return voids?.has(suit);
    });

    // The first cutter must be at index >= 1 (i.e. not the immediate next player)
    if (firstCutterIndex >= 1) {
      const cutter = upcomingPlayers[firstCutterIndex];
      const intermediatePlayers = upcomingPlayers.slice(0, firstCutterIndex);

      for (const target of intermediatePlayers) {
        const isVulnerable =
          target.getHand().length > 0 && target.getHand().length <= 4;
        trapOptions.push({
          card,
          targetPlayer: target,
          cutterPlayer: cutter,
          isVulnerableTarget: isVulnerable,
        });
      }
    }
  }

  if (trapOptions.length === 0) return null;

  // Priority 1: Traps targeting vulnerable opponents (<= 4 cards)
  const vulnerableTraps = trapOptions.filter((t) => t.isVulnerableTarget);
  if (vulnerableTraps.length > 0) {
    // Select the trap with the lowest card rank to make it virtually impossible for target to play lower
    return vulnerableTraps.reduce((lowest, t) =>
      RANK_VALUES[t.card.rank] < RANK_VALUES[lowest.card.rank] ? t : lowest
    );
  }

  // Priority 2: General traps - return the lowest card rank option
  return trapOptions.reduce((lowest, t) =>
    RANK_VALUES[t.card.rank] < RANK_VALUES[lowest.card.rank] ? t : lowest
  );
}

export function chooseLeadCard(
  state: GameState,
  botPlayer: Player,
  allPlayers: readonly Player[],
  discardedHistory: readonly Card[],
  personality?: BotPersonalityType | BotPersonality
): Card {
  const profile = resolveBotPersonality(botPlayer, personality);
  const hand = botPlayer.getHand();
  const upcomingPlayers = getUpcomingActivePlayers(botPlayer, allPlayers);
  const suitsInHand = new Set<Suit>(hand.map((c) => c.suit));

  // =========================================================================
  // 1. Tactical Cut Trap (Weaponizing Opponents' Voids)
  // =========================================================================
  const cutTrap = findCutTrapLead(state, botPlayer, allPlayers, discardedHistory, profile);

  if (cutTrap) {
    // Condition A: If target is vulnerable (hand <= 4 cards), ALWAYS spring the trap!
    // Sabotaging an opponent who is about to exit takes precedence over everything.
    if (cutTrap.isVulnerableTarget) {
      return cutTrap.card;
    }

    // Condition B: If ALL suits in bot's hand have voids (no completely clean suits),
    // a valid cut trap is strictly better than blind lead or Tier 2 fallback.
    const allSuitsHaveVoids = Array.from(suitsInHand).every((suit) =>
      upcomingPlayers.some((p) => state.getPlayerSuitVoids().get(p.getId())?.has(suit))
    );
    if (allSuitsHaveVoids && hand.length > profile.panicThreshold) {
      return cutTrap.card;
    }

    // Condition C: In normal play (hand > panicThreshold) with an ultra-low card (rank <= 3),
    // if target has fewer cards than bot, spring the trap to slow them down.
    if (
      hand.length > profile.panicThreshold &&
      RANK_VALUES[cutTrap.card.rank] <= 3 &&
      cutTrap.targetPlayer.getHand().length > 0 &&
      cutTrap.targetPlayer.getHand().length < hand.length
    ) {
      return cutTrap.card;
    }
  }

  // =========================================================================
  // 2. Standard Safe Lead Filtering (Full-Table Void Awareness)
  // =========================================================================
  let cardsToConsider = [...hand];

  if (suitsInHand.size > 1 && upcomingPlayers.length > 0) {
    // Check voids across ALL upcoming active players on the table
    const suitsWithVoids = new Set<Suit>();
    const immediateNextPlayer = upcomingPlayers[0];
    const immediateVoids =
      state.getPlayerSuitVoids().get(immediateNextPlayer.getId()) ?? new Set<Suit>();

    for (const player of upcomingPlayers) {
      const voids = state.getPlayerSuitVoids().get(player.getId());
      if (voids) {
        for (const suit of voids) {
          suitsWithVoids.add(suit);
        }
      }
    }

    // Tier 1: Cards in suits where NO upcoming player is void (guarantees a clean trick)
    const completelySafeCards = hand.filter((c) => !suitsWithVoids.has(c.suit));
    if (completelySafeCards.length > 0) {
      cardsToConsider = completelySafeCards;
    } else {
      // Tier 2: If every suit in hand has at least one player void,
      // at least avoid suits where the IMMEDIATE next player is void.
      // Leading into an immediate void guarantees 100% that the bot suffers the Vettu penalty.
      const safeFromImmediateCards = hand.filter((c) => !immediateVoids.has(c.suit));
      if (safeFromImmediateCards.length > 0) {
        cardsToConsider = safeFromImmediateCards;
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

  if (hand.length <= profile.panicThreshold) {
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

export function chooseFollowCard(
  state: GameState,
  botPlayer: Player,
  allPlayers: readonly Player[],
  discardedHistory: readonly Card[],
  personality?: BotPersonalityType | BotPersonality
): Card {
  const profile = resolveBotPersonality(botPlayer, personality);
  const hand = botPlayer.getHand();
  const activeSuit = state.getActiveRoundSuit()!;
  const matchingCards = hand.filter((c) => c.suit === activeSuit);

  // Single matching card: forced play
  if (matchingCards.length === 1) {
    return matchingCards[0];
  }

  const tablePile = state.getTablePile();
  const activeMatchingOnPile = tablePile.filter((pc) => pc.card.suit === activeSuit);

  let highestActivePlayed: PlayedCard = activeMatchingOnPile[0];
  for (let i = 1; i < activeMatchingOnPile.length; i++) {
    if (RANK_VALUES[activeMatchingOnPile[i].card.rank] > RANK_VALUES[highestActivePlayed.card.rank]) {
      highestActivePlayed = activeMatchingOnPile[i];
    }
  }
  const maxPileValue = highestActivePlayed ? RANK_VALUES[highestActivePlayed.card.rank] : 0;

  // Partition into cards strictly below current pile max and strictly above
  const underCards = matchingCards.filter((c) => RANK_VALUES[c.rank] < maxPileValue);
  const overCards = matchingCards.filter((c) => RANK_VALUES[c.rank] > maxPileValue);

  const activePlayers = allPlayers.filter((p) => !p.hasGottenAway());
  const isLastPlayerInTrick = tablePile.length >= activePlayers.length - 1;

  // Check if any upcoming player in this trick has a known void in the active suit
  const playersPlayed = new Set(tablePile.map((pc) => pc.playerId));
  const upcomingPlayers = allPlayers.filter(
    (p) => !p.hasGottenAway() && p.getId() !== botPlayer.getId() && !playersPlayed.has(p.getId())
  );
  const hasUpcomingVoid = upcomingPlayers.some((p) => {
    const voids = state.getPlayerSuitVoids().get(p.getId());
    return voids?.has(activeSuit);
  });

  // 1. Endgame Panic Mode (<= panicThreshold cards left in hand):
  // When close to winning, take the lead if possible so the bot can lead its remaining cards and escape!
  // Avoid taking if an upcoming player has a known void, which would trigger a Vettu penalty onto this bot.
  if (hand.length <= profile.panicThreshold && overCards.length > 0 && !hasUpcomingVoid) {
    return overCards.reduce((min, c) =>
      RANK_VALUES[c.rank] < RANK_VALUES[min.rank] ? c : min
    );
  }

  // 2. 4th Seat / Last to Play "Trash Dump" (Zero Vettu Risk):
  // As the last player, the trick is guaranteed to complete and discard.
  if (isLastPlayerInTrick) {
    if (underCards.length > 0) {
      // Safe trash dump: dump the highest card safely below the winner, preserving lower exit cards
      return underCards.reduce((max, c) =>
        RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
      );
    }
    // All matching cards are higher than the pile; bot is forced to win. Play lowest winning card.
    return overCards.reduce((min, c) =>
      RANK_VALUES[c.rank] < RANK_VALUES[min.rank] ? c : min
    );
  }

  // 3. Aggressive Over-take (Personality-specific, e.g. Leo the Gambler):
  // When holding overcards and no upcoming voids threaten a cut, an aggressive personality
  // seizes the trick early to capture the lead.
  if (overCards.length > 0 && !hasUpcomingVoid && profile.overtakeAggressiveness > 0) {
    if (Math.random() < profile.overtakeAggressiveness) {
      return overCards.reduce((min, c) =>
        RANK_VALUES[c.rank] < RANK_VALUES[min.rank] ? c : min
      );
    }
  }

  // 4. Middle Turn Ducking (Upcoming Players Yet to Play):
  // If the bot has cards below maxPileValue, duck safely!
  // Playing the highest card under maxPileValue sheds a higher/middle card while keeping lower cards
  // (e.g. 2, 3) as future emergency exits, and keeps Vettu liability on the current highest player.
  if (underCards.length > 0) {
    return underCards.reduce((max, c) =>
      RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
    );
  }

  // 5. Forced Over-play:
  // All matching cards are higher than current pile max; play the lowest overCard to minimize waste.
  return overCards.reduce((min, c) =>
    RANK_VALUES[c.rank] < RANK_VALUES[min.rank] ? c : min
  );
}

/**
 * Choose the best card to play when executing a Vettu (Cut / Strike).
 * Since the bot cannot follow the active suit, it has free choice of any off-suit card.
 *
 * Tactical human cut decisions:
 * 1. Target Revenge Mode (Endgame Sabotage):
 *    If the player currently taking the trick (highest of active suit) is vulnerable
 *    (hand <= 3 cards), dump the highest card overall to penalize them heavily.
 * 2. Strategic Void Creation:
 *    When not in revenge mode, the primary goal is creating or advancing toward voids.
 *    - Singletons (length 1): Playing a singleton creates an immediate void.
 *      Prefer dumping the highest singleton.
 *    - Doubletons (length 2): If no singletons, slim down a 2-card suit into a singleton
 *      by dumping its higher card, setting up a void on the next turn.
 *    - Shortest Suit Fallback: If no singletons or doubletons, slim down the shortest
 *      available suit by playing its highest rank card.
 */
export function chooseVettuCard(
  state: GameState,
  botPlayer: Player,
  allPlayers: readonly Player[],
  discardedHistory: readonly Card[],
  personality?: BotPersonalityType | BotPersonality
): Card {
  const profile = resolveBotPersonality(botPlayer, personality);
  const hand = botPlayer.getHand();
  const tablePile = state.getTablePile();
  const activeSuit = state.getActiveRoundSuit();

  if (!activeSuit) {
    throw new Error('Active round suit cannot be null when table pile is not empty');
  }

  const activeSuitPlayed = tablePile.filter((pc) => pc.card.suit === activeSuit);
  let highestActivePlayed: PlayedCard | null = null;
  if (activeSuitPlayed.length > 0) {
    highestActivePlayed = activeSuitPlayed.reduce((max, pc) =>
      RANK_VALUES[pc.card.rank] > RANK_VALUES[max.card.rank] ? pc : max
    );
  }

  // 1. Target Revenge Mode:
  // If the player who will take the penalty pile is vulnerable (<= 3 cards),
  // dump the highest card in hand to weigh them down with heavy cards.
  if (highestActivePlayed) {
    const vulnerablePlayerId = highestActivePlayed.playerId;
    const vulnerablePlayer = allPlayers.find((p) => p.getId() === vulnerablePlayerId);
    if (vulnerablePlayer && vulnerablePlayer.getHand().length > 0 && vulnerablePlayer.getHand().length <= 3) {
      return hand.reduce((max, c) =>
        RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
      );
    }
  }

  // 2. Group hand by suit to analyze suit lengths
  const groupedBySuit = new Map<Suit, Card[]>();
  for (const card of hand) {
    const group = groupedBySuit.get(card.suit) ?? [];
    group.push(card);
    groupedBySuit.set(card.suit, group);
  }

  // Sort suits by length ascending (1 card, 2 cards, 3 cards, etc.)
  const sortedSuits = Array.from(groupedBySuit.entries()).sort(
    (a, b) => a[1].length - b[1].length
  );

  const singletons: Card[] = [];
  const doubletons: Card[] = [];
  for (const [, cards] of sortedSuits) {
    if (cards.length === 1) {
      singletons.push(...cards);
    } else if (cards.length === 2) {
      doubletons.push(...cards);
    }
  }

  // Case A: Bot holds singletons (immediate void opportunity)
  if (singletons.length > 0) {
    const probability = Math.random();

    // Leo (aggressive gambler) has a 50% tendency to dump the highest card in entire hand to brutally punish
    if (profile.type === 'leo' && probability > profile.singletonShedRate) {
      return hand.reduce((max, c) =>
        RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
      );
    }

    const highDoubletonCards = doubletons.filter((c) => RANK_VALUES[c.rank] > 10);
    // Otherwise, check singletonShedRate threshold
    if (probability < profile.singletonShedRate || highDoubletonCards.length === 0) {
      return singletons.reduce((max, c) =>
        RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
      );
    } else {
      // Human variation: dump a heavy card (>10) from a 2-card suit to slim it down
      return highDoubletonCards.reduce((max, c) =>
        RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
      );
    }
  }

  // Case B: No singletons, but holds 2-card suits (Doubletons)
  // Slim down the 2-card suit to create a singleton for next time!
  if (doubletons.length > 0) {
    return doubletons.reduce((max, c) =>
      RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
    );
  }

  // Case C: No singletons or doubletons (e.g. only 3+ card suits)
  // Slim down the shortest available suit by playing its highest rank card
  const shortestSuitCards = sortedSuits[0][1];
  return shortestSuitCards.reduce((max, c) =>
    RANK_VALUES[c.rank] > RANK_VALUES[max.rank] ? c : max
  );
}

export function calculateBotMove(
  state: GameState,
  botPlayer: Player,
  allPlayers: readonly Player[],
  discardedHistory: readonly Card[],
  personality?: BotPersonalityType | BotPersonality
): Card {
  if (!state) throw new Error('GameState cannot be null');
  if (!botPlayer) throw new Error('Player cannot be null');
  if (!allPlayers) throw new Error('All players list cannot be null');
  if (!discardedHistory) throw new Error('Discarded history cannot be null');

  const profile = resolveBotPersonality(botPlayer, personality);
  const hand = botPlayer.getHand();
  if (hand.length === 0) {
    throw new Error('Bot hand is empty, cannot calculate move');
  }

  if (state.getTablePile().length === 0) {
    return chooseLeadCard(state, botPlayer, allPlayers, discardedHistory, profile);
  }

  const activeSuit = state.getActiveRoundSuit();
  if (!activeSuit) {
    throw new Error('Active round suit cannot be null when table pile is not empty');
  }

  const matchingCards = hand.filter((c) => c.suit === activeSuit);
  if (matchingCards.length > 0) {
    return chooseFollowCard(state, botPlayer, allPlayers, discardedHistory, profile);
  }

  // Cannot follow suit -> Vettu cut!
  return chooseVettuCard(state, botPlayer, allPlayers, discardedHistory, profile);
}

export class BotService {
  public calculateBotMove(
    state: GameState,
    botPlayer: Player,
    allPlayers: readonly Player[],
    discardedHistory: readonly Card[],
    personality?: BotPersonalityType | BotPersonality
  ): Card {
    return calculateBotMove(state, botPlayer, allPlayers, discardedHistory, personality);
  }

  public chooseLeadCard(
    state: GameState,
    botPlayer: Player,
    allPlayers: readonly Player[],
    discardedHistory: readonly Card[],
    personality?: BotPersonalityType | BotPersonality
  ): Card {
    return chooseLeadCard(state, botPlayer, allPlayers, discardedHistory, personality);
  }

  public findCutTrapLead(
    state: GameState,
    botPlayer: Player,
    allPlayers: readonly Player[],
    discardedHistory: readonly Card[],
    personality?: BotPersonalityType | BotPersonality
  ): CutTrapOption | null {
    return findCutTrapLead(state, botPlayer, allPlayers, discardedHistory, personality);
  }

  public chooseFollowCard(
    state: GameState,
    botPlayer: Player,
    allPlayers: readonly Player[],
    discardedHistory: readonly Card[],
    personality?: BotPersonalityType | BotPersonality
  ): Card {
    return chooseFollowCard(state, botPlayer, allPlayers, discardedHistory, personality);
  }

  public chooseVettuCard(
    state: GameState,
    botPlayer: Player,
    allPlayers: readonly Player[],
    discardedHistory: readonly Card[],
    personality?: BotPersonalityType | BotPersonality
  ): Card {
    return chooseVettuCard(state, botPlayer, allPlayers, discardedHistory, personality);
  }

  public getPersonality(
    botPlayer: Player,
    explicitPersonality?: BotPersonalityType | BotPersonality
  ): BotPersonality {
    return resolveBotPersonality(botPlayer, explicitPersonality);
  }

  public shuffleBotSeats(
    characters: readonly string[] = BOT_CHARACTERS
  ): string[] {
    return shuffleBotSeats(characters);
  }
}
