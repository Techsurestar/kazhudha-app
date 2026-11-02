import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Card,
  Player,
  GameState,
  BotService,
  cardEquals,
} from '../index.js';
import {
  isHighestRemainingOfSuit,
  getNextActivePlayer,
  getUpcomingActivePlayers,
  findCutTrapLead,
  chooseLeadCard,
  chooseFollowCard,
  chooseVettuCard,
  calculateBotMove,
  resolveBotPersonality,
  SOFIA_PERSONALITY,
  LEO_PERSONALITY,
  JENNY_PERSONALITY,
  BOT_CHARACTERS,
  shuffleBotSeats,
} from '../services/bot.js';

describe('BotService & Bot AI Decisions', () => {
  let botService: BotService;

  beforeEach(() => {
    botService = new BotService();
  });

  // =========================================================================
  // 1. Helper Function Tests
  // =========================================================================
  describe('Helper Functions', () => {
    it('getNextActivePlayer should identify next clockwise player and skip escaped players', () => {
      const p1 = new Player('p1', 'Player 1', false);
      const p2 = new Player('p2', 'Player 2', true);
      const p3 = new Player('p3', 'Player 3', true);
      const p4 = new Player('p4', 'Player 4', true);
      const players = [p1, p2, p3, p4];

      // Next player after p1 is p2
      expect(getNextActivePlayer(p1, players)?.getId()).toBe('p2');

      // Next player after p4 wraps to p1
      expect(getNextActivePlayer(p4, players)?.getId()).toBe('p1');

      // If p2 has gotten away, skip p2 and return p3
      p2.setHasGottenAway(true);
      expect(getNextActivePlayer(p1, players)?.getId()).toBe('p3');

      // If p2 and p3 have gotten away, return p4
      p3.setHasGottenAway(true);
      expect(getNextActivePlayer(p1, players)?.getId()).toBe('p4');

      // If all others have gotten away, return null
      p4.setHasGottenAway(true);
      expect(getNextActivePlayer(p1, players)).toBeNull();
    });

    it('getUpcomingActivePlayers should return all remaining active players in clockwise trick order', () => {
      const p1 = new Player('p1', 'Player 1', false);
      const p2 = new Player('p2', 'Player 2', true);
      const p3 = new Player('p3', 'Player 3', true);
      const p4 = new Player('p4', 'Player 4', true);
      const players = [p1, p2, p3, p4];

      const upcoming = getUpcomingActivePlayers(p1, players);
      expect(upcoming.map((p) => p.getId())).toEqual(['p2', 'p3', 'p4']);

      // If p3 got away, skip p3
      p3.setHasGottenAway(true);
      expect(getUpcomingActivePlayers(p1, players).map((p) => p.getId())).toEqual(['p2', 'p4']);
    });

    it('isHighestRemainingOfSuit should detect absolute highest and relative highest cards', () => {
      const aceOfSpades: Card = { suit: 'SPADES', rank: 'ACE' };
      const kingOfSpades: Card = { suit: 'SPADES', rank: 'KING' };
      const queenOfSpades: Card = { suit: 'SPADES', rank: 'QUEEN' };

      // Ace is always the highest card
      expect(isHighestRemainingOfSuit(aceOfSpades, [aceOfSpades], [])).toBe(true);

      // King is NOT highest if Ace is unknown / unaccounted for
      expect(isHighestRemainingOfSuit(kingOfSpades, [kingOfSpades], [])).toBe(false);

      // King IS highest if Ace has already been discarded
      expect(isHighestRemainingOfSuit(kingOfSpades, [kingOfSpades], [aceOfSpades])).toBe(true);

      // King IS highest if Ace is in the bot's own hand
      expect(isHighestRemainingOfSuit(kingOfSpades, [kingOfSpades, aceOfSpades], [])).toBe(true);

      // Queen is highest if both Ace and King are accounted for
      expect(
        isHighestRemainingOfSuit(queenOfSpades, [queenOfSpades, kingOfSpades], [aceOfSpades])
      ).toBe(true);
    });
  });

  // =========================================================================
  // 2. Lead Turn Decision Tests (Table Pile is Empty)
  // =========================================================================
  describe('Lead Turn Decisions (Table Pile Empty)', () => {
    it('should lead with the lowest card in normal play (> 3 cards)', () => {
      const bot = new Player('bot', 'Bot', true);
      bot.addCards([
        { suit: 'HEARTS', rank: 'TEN' },
        { suit: 'HEARTS', rank: 'FOUR' },
        { suit: 'CLUBS', rank: 'SEVEN' },
        { suit: 'DIAMONDS', rank: 'EIGHT' },
      ]);
      const opponent = new Player('p1', 'Player 1', false);
      const players = [bot, opponent];
      const state = new GameState(players);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Lowest rank card is 4 of Hearts
      expect(move).toEqual({ suit: 'HEARTS', rank: 'FOUR' });
    });

    it('should trigger endgame panic and lead with HIGHEST card when hand <= 3 cards', () => {
      const bot = new Player('bot', 'Bot', true);
      bot.addCards([
        { suit: 'CLUBS', rank: 'THREE' },
        { suit: 'CLUBS', rank: 'JACK' },
        { suit: 'SPADES', rank: 'EIGHT' },
      ]); // 3 cards -> Panic mode!
      const opponent = new Player('p1', 'Player 1', false);
      const players = [bot, opponent];
      const state = new GameState(players);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Highest card in hand is Jack of Clubs
      expect(move).toEqual({ suit: 'CLUBS', rank: 'JACK' });
    });

    it('should avoid leading a suit that the next active player is void in', () => {
      const bot = new Player('bot', 'Bot', true);
      const nextPlayer = new Player('next', 'Next', true);
      const otherPlayer = new Player('other', 'Other', false);
      const players = [bot, nextPlayer, otherPlayer];

      const state = new GameState(players);
      // Next player is void in SPADES
      state.getPlayerSuitVoids().get('next')?.add('SPADES');

      bot.addCards([
        { suit: 'SPADES', rank: 'TWO' },   // Lowest rank overall, but next player is void!
        { suit: 'HEARTS', rank: 'FIVE' },  // Safe suit
        { suit: 'CLUBS', rank: 'SIX' },
        { suit: 'DIAMONDS', rank: 'SEVEN' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Must NOT play 2 of Spades because next player will Vettu; plays lowest safe card (5 of Hearts)
      expect(move).toEqual({ suit: 'HEARTS', rank: 'FIVE' });
    });

    it('should avoid leading a suit that any upcoming player is void in (even if immediate next player has cards)', () => {
      // 4 active players: Bot (leads), P2, P3, P4
      const bot = new Player('bot', 'Bot', true);
      const p2 = new Player('p2', 'Player 2', false);
      const p3 = new Player('p3', 'Player 3', false);
      const p4 = new Player('p4', 'Player 4', false);
      const players = [bot, p2, p3, p4];

      const state = new GameState(players);
      // P2 has no voids. P3 has a known void in SPADES!
      state.getPlayerSuitVoids().get('p3')?.add('SPADES');

      bot.addCards([
        { suit: 'SPADES', rank: 'TWO' },   // Lowest rank overall, but P3 will cut!
        { suit: 'HEARTS', rank: 'FIVE' },  // Safe suit (no player void)
        { suit: 'CLUBS', rank: 'SIX' },
        { suit: 'DIAMONDS', rank: 'SEVEN' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Full-table awareness: avoids Spades because P3 is void, and leads lowest safe card (5 of Hearts)
      expect(move).toEqual({ suit: 'HEARTS', rank: 'FIVE' });
    });

    it('should avoid leading a suit that the 4th/last seat player is void in', () => {
      const bot = new Player('bot', 'Bot', true);
      const p2 = new Player('p2', 'Player 2', false);
      const p3 = new Player('p3', 'Player 3', false);
      const p4 = new Player('p4', 'Player 4', false);
      const players = [bot, p2, p3, p4];

      const state = new GameState(players);
      // P4 has a known void in CLUBS!
      state.getPlayerSuitVoids().get('p4')?.add('CLUBS');

      bot.addCards([
        { suit: 'CLUBS', rank: 'TWO' },     // Lowest rank, but P4 is void!
        { suit: 'DIAMONDS', rank: 'FOUR' }, // Safe suit
        { suit: 'DIAMONDS', rank: 'SIX' },
        { suit: 'DIAMONDS', rank: 'EIGHT' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      expect(move).toEqual({ suit: 'DIAMONDS', rank: 'FOUR' });
    });

    it('should prefer a suit where immediate next player is NOT void when all suits have voids', () => {
      // 3 active players: Bot (leads), P2 (immediate), P3 (subsequent)
      const bot = new Player('bot', 'Bot', true);
      const p2 = new Player('p2', 'Player 2', false);
      const p3 = new Player('p3', 'Player 3', false);
      const players = [bot, p2, p3];

      const state = new GameState(players);
      // P2 is void in HEARTS (leading Hearts guarantees Bot takes 100% penalty)
      state.getPlayerSuitVoids().get('p2')?.add('HEARTS');
      // P3 is void in SPADES (P2 must play first and might over-play Bot)
      state.getPlayerSuitVoids().get('p3')?.add('SPADES');

      bot.addCards([
        { suit: 'HEARTS', rank: 'THREE' }, // Immediate void on P2!
        { suit: 'SPADES', rank: 'FIVE' },   // Non-immediate void on P3
        { suit: 'HEARTS', rank: 'SIX' },
        { suit: 'SPADES', rank: 'SEVEN' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Avoids Hearts because P2 would cut immediately; leads 5 of Spades
      expect(move).toEqual({ suit: 'SPADES', rank: 'FIVE' });
    });

    it('should avoid leading a void suit during endgame panic mode (hand <= 3 cards)', () => {
      const bot = new Player('bot', 'Bot', true);
      const p2 = new Player('p2', 'Player 2', false);
      const p3 = new Player('p3', 'Player 3', false);
      const players = [bot, p2, p3];

      const state = new GameState(players);
      // P3 is void in SPADES
      state.getPlayerSuitVoids().get('p3')?.add('SPADES');

      // Bot has 3 cards (endgame panic mode)
      bot.addCards([
        { suit: 'SPADES', rank: 'KING' },   // Highest card overall, but P3 will cut!
        { suit: 'HEARTS', rank: 'TEN' },    // Safe high card
        { suit: 'DIAMONDS', rank: 'EIGHT' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // In endgame panic, avoids Spades because of P3's void, and leads highest safe card (10 of Hearts)
      expect(move).toEqual({ suit: 'HEARTS', rank: 'TEN' });
    });

    // =========================================================================
    // 2C: Setting Up a Cut (Weaponizing Other Players' Voids)
    // =========================================================================
    it('findCutTrapLead should identify target player before cutter and pick lowest trap card', () => {
      const bot = new Player('bot', 'Bot', true);
      const p2 = new Player('p2', 'Leo', false);
      p2.addCards([
        { suit: 'SPADES', rank: 'TEN' },
        { suit: 'SPADES', rank: 'JACK' },
      ]); // Vulnerable target (2 cards)
      const p3 = new Player('p3', 'Sofia', false);
      const p4 = new Player('p4', 'John', false);
      const players = [bot, p2, p3, p4];

      const state = new GameState(players);
      // Sofia (P3) is known to be void in SPADES
      state.getPlayerSuitVoids().get('p3')?.add('SPADES');

      bot.addCards([
        { suit: 'SPADES', rank: 'THREE' },
        { suit: 'SPADES', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'FOUR' },
      ]);

      const trap = botService.findCutTrapLead(state, bot, players, []);
      expect(trap).not.toBeNull();
      expect(trap?.card).toEqual({ suit: 'SPADES', rank: 'THREE' });
      expect(trap?.targetPlayer.getId()).toBe('p2');
      expect(trap?.cutterPlayer.getId()).toBe('p3');
      expect(trap?.isVulnerableTarget).toBe(true);
    });

    it('should intentionally lead a low card to spring a Cut Trap on a vulnerable opponent (<= 4 cards) even if clean suits exist', () => {
      const bot = new Player('bot', 'Bot', true);
      const leo = new Player('leo', 'Leo', false);
      // Leo is down to 2 cards and about to win!
      leo.addCards([
        { suit: 'CLUBS', rank: 'FOUR' },
        { suit: 'CLUBS', rank: 'FIVE' },
      ]);
      const sofia = new Player('sofia', 'Sofia', false);
      const john = new Player('john', 'John', false);
      const players = [bot, leo, sofia, john];

      const state = new GameState(players);
      // Sofia is void in SPADES!
      state.getPlayerSuitVoids().get('sofia')?.add('SPADES');

      bot.addCards([
        { suit: 'SPADES', rank: 'TWO' },      // Low trap card (rank <= 7)
        { suit: 'DIAMONDS', rank: 'FIVE' },   // Completely clean suit (no voids on table)
        { suit: 'HEARTS', rank: 'SIX' },      // Clean suit
        { suit: 'CLUBS', rank: 'SEVEN' },     // Clean suit
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Instead of leading clean 5 of Diamonds, bot springs the Cut Trap on Leo with 2 of Spades!
      // Leo is forced to play a Spade, Sofia cuts, and Leo absorbs the penalty pile.
      expect(move).toEqual({ suit: 'SPADES', rank: 'TWO' });
    });

    it('should NOT attempt a Cut Trap with a high card (rank > 7) to avoid taking the penalty', () => {
      const bot = new Player('bot', 'Bot', true);
      const leo = new Player('leo', 'Leo', false);
      leo.addCards([
        { suit: 'CLUBS', rank: 'FOUR' },
        { suit: 'CLUBS', rank: 'FIVE' },
      ]);
      const sofia = new Player('sofia', 'Sofia', false);
      const john = new Player('john', 'John', false);
      const players = [bot, leo, sofia, john];

      const state = new GameState(players);
      state.getPlayerSuitVoids().get('sofia')?.add('SPADES');

      bot.addCards([
        { suit: 'SPADES', rank: 'KING' },     // High card (rank 13 > 7) - too dangerous for a trap!
        { suit: 'DIAMONDS', rank: 'FOUR' },   // Clean suit
        { suit: 'HEARTS', rank: 'SIX' },      // Clean suit
        { suit: 'CLUBS', rank: 'SEVEN' },     // Clean suit
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Should NOT lead King of Spades; leads lowest safe clean card (4 of Diamonds)
      expect(move).toEqual({ suit: 'DIAMONDS', rank: 'FOUR' });
    });

    it('should pick the lowest trap card when multiple trap cards are held to ensure target overplays', () => {
      const bot = new Player('bot', 'Bot', true);
      const leo = new Player('leo', 'Leo', false);
      leo.addCards([
        { suit: 'CLUBS', rank: 'FOUR' },
        { suit: 'CLUBS', rank: 'FIVE' },
        { suit: 'CLUBS', rank: 'SIX' },
      ]);
      const sofia = new Player('sofia', 'Sofia', false);
      const john = new Player('john', 'John', false);
      const players = [bot, leo, sofia, john];

      const state = new GameState(players);
      state.getPlayerSuitVoids().get('sofia')?.add('SPADES');

      bot.addCards([
        { suit: 'SPADES', rank: 'TWO' },      // Lowest trap card
        { suit: 'SPADES', rank: 'SIX' },      // Higher trap card
        { suit: 'DIAMONDS', rank: 'FOUR' },   // Clean suit
        { suit: 'HEARTS', rank: 'FIVE' },     // Clean suit
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Picks 2 of Spades over 6 of Spades
      expect(move).toEqual({ suit: 'SPADES', rank: 'TWO' });
    });

    it('should NOT consider a Cut Trap if the cutter is the immediate next player', () => {
      const bot = new Player('bot', 'Bot', true);
      const leo = new Player('leo', 'Leo', false); // Immediate next player
      const sofia = new Player('sofia', 'Sofia', false);
      const players = [bot, leo, sofia];

      const state = new GameState(players);
      // Leo (immediate next player) is void in SPADES
      state.getPlayerSuitVoids().get('leo')?.add('SPADES');

      bot.addCards([
        { suit: 'SPADES', rank: 'TWO' },      // Cutter is immediate next, so this is NOT a trap!
        { suit: 'DIAMONDS', rank: 'FOUR' },   // Clean suit (>3 cards, normal play)
        { suit: 'DIAMONDS', rank: 'FIVE' },
        { suit: 'DIAMONDS', rank: 'SIX' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Avoids Spades (immediate cut on bot) and leads safe 4 of Diamonds
      expect(move).toEqual({ suit: 'DIAMONDS', rank: 'FOUR' });
    });

    it('should avoid leading high singleton cards (rank > 10) to prevent being ambushed', () => {
      const bot = new Player('bot', 'Bot', true);
      const opponent = new Player('p1', 'Player 1', false);
      const players = [bot, opponent];
      const state = new GameState(players);

      bot.addCards([
        { suit: 'SPADES', rank: 'ACE' }, // High singleton (>10)
        { suit: 'HEARTS', rank: 'EIGHT' },
        { suit: 'HEARTS', rank: 'NINE' },
        { suit: 'CLUBS', rank: 'TEN' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Should avoid leading solo Ace of Spades; leads lowest safe non-singleton (8 of Hearts)
      expect(move).toEqual({ suit: 'HEARTS', rank: 'EIGHT' });
    });

    it('should preserve weapon cards (highest remaining of suit) for future leads', () => {
      const bot = new Player('bot', 'Bot', true);
      const opponent = new Player('p1', 'Player 1', false);
      const players = [bot, opponent];
      const state = new GameState(players);

      // King of Clubs is the highest remaining Club because Ace of Clubs was already discarded
      const aceOfClubs: Card = { suit: 'CLUBS', rank: 'ACE' };
      bot.addCards([
        { suit: 'CLUBS', rank: 'KING' }, // Weapon card!
        { suit: 'CLUBS', rank: 'THREE' },
        { suit: 'DIAMONDS', rank: 'FOUR' },
        { suit: 'DIAMONDS', rank: 'FIVE' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, [aceOfClubs]);
      // Should not burn the weapon; plays lowest non-weapon candidate (3 of Clubs)
      expect(move).toEqual({ suit: 'CLUBS', rank: 'THREE' });
    });
  });

  // =========================================================================
  // 3. Follow-Suit Turn Decision Tests (Table Pile has Active Suit)
  // =========================================================================
  describe('Follow-Suit Turn Decisions (Ducking vs. Winning)', () => {
    it('should play the only matching card when forced with a single card of active suit', () => {
      const bot = new Player('bot', 'Bot', true);
      const lead = new Player('lead', 'Lead', false);
      const players = [lead, bot];
      const state = new GameState(players);

      state.addToTablePile({ playerId: 'lead', card: { suit: 'HEARTS', rank: 'SEVEN' } });
      state.setActiveRoundSuit('HEARTS');

      bot.addCards([
        { suit: 'HEARTS', rank: 'KING' },
        { suit: 'SPADES', rank: 'TWO' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      expect(move).toEqual({ suit: 'HEARTS', rank: 'KING' });
    });

    it('should duck with the highest under-card below the current winner in middle turn (preserving low exit cards)', () => {
      // 4 active players: P1 (lead), P2, Bot (P3), P4
      const p1 = new Player('p1', 'P1', false);
      const p2 = new Player('p2', 'P2', false);
      const bot = new Player('bot', 'Bot', true);
      const p4 = new Player('p4', 'P4', false);
      const players = [p1, p2, bot, p4];
      const state = new GameState(players);

      // P1 led 5 of Spades, P2 played Jack of Spades (current winner on pile = Jack)
      state.addToTablePile({ playerId: 'p1', card: { suit: 'SPADES', rank: 'FIVE' } });
      state.addToTablePile({ playerId: 'p2', card: { suit: 'SPADES', rank: 'JACK' } });
      state.setActiveRoundSuit('SPADES');

      // Bot holds 2, 8, 9, King of Spades (> 3 cards -> normal play)
      bot.addCards([
        { suit: 'SPADES', rank: 'TWO' },   // Lowest exit card
        { suit: 'SPADES', rank: 'EIGHT' },
        { suit: 'SPADES', rank: 'NINE' },  // Highest card under Jack!
        { suit: 'SPADES', rank: 'KING' },  // Over card (> Jack)
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Instead of burning the 2 of Spades, bot ducks safely with the 9 of Spades (below Jack),
      // keeping the Vettu penalty liability on P2 (Jack) while shedding the 9 and preserving the 2!
      expect(move).toEqual({ suit: 'SPADES', rank: 'NINE' });
    });

    it('should perform a safe trash dump in 4th seat (last player) under an opponent Ace', () => {
      // 4 active players; Bot is 4th to play
      const p1 = new Player('p1', 'P1', false);
      const p2 = new Player('p2', 'P2', false);
      const p3 = new Player('p3', 'P3', false);
      const bot = new Player('bot', 'Bot', true);
      const players = [p1, p2, p3, bot];
      const state = new GameState(players);

      // P1 led Ace of Spades, P2 played 7, P3 played 4
      state.addToTablePile({ playerId: 'p1', card: { suit: 'SPADES', rank: 'ACE' } });
      state.addToTablePile({ playerId: 'p2', card: { suit: 'SPADES', rank: 'SEVEN' } });
      state.addToTablePile({ playerId: 'p3', card: { suit: 'SPADES', rank: 'FOUR' } });
      state.setActiveRoundSuit('SPADES');

      // Bot is 4th player. Holds 3, 9, and King of Spades, plus 1 card of another suit (> 3 cards)
      bot.addCards([
        { suit: 'SPADES', rank: 'THREE' },
        { suit: 'SPADES', rank: 'NINE' },
        { suit: 'SPADES', rank: 'KING' }, // High card below Ace!
        { suit: 'CLUBS', rank: 'TWO' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Since Ace is already winning and no one can Vettu (bot is last player),
      // bot safely trashes the King into the discard pile, preserving the 3 of Spades!
      expect(move).toEqual({ suit: 'SPADES', rank: 'KING' });
    });

    it('should take the trick in endgame panic mode (<= 3 cards) to gain the lead and escape', () => {
      const p1 = new Player('p1', 'P1', false);
      const bot = new Player('bot', 'Bot', true);
      const p3 = new Player('p3', 'P3', false);
      const players = [p1, bot, p3];
      const state = new GameState(players);

      // P1 led 6 of Clubs
      state.addToTablePile({ playerId: 'p1', card: { suit: 'CLUBS', rank: 'SIX' } });
      state.setActiveRoundSuit('CLUBS');

      // Bot has only 2 cards remaining (endgame panic mode): Ten of Clubs and 2 of Diamonds
      bot.addCards([
        { suit: 'CLUBS', rank: 'TEN' },    // Can beat 6 of Clubs!
        { suit: 'DIAMONDS', rank: 'TWO' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // In panic mode with no upcoming voids, bot plays 10 to win the trick and gain the lead!
      expect(move).toEqual({ suit: 'CLUBS', rank: 'TEN' });
    });

    it('should NOT take the trick in endgame panic mode if an upcoming player has a known void', () => {
      const p1 = new Player('p1', 'P1', false);
      const bot = new Player('bot', 'Bot', true);
      const p3 = new Player('p3', 'P3', false);
      const players = [p1, bot, p3];
      const state = new GameState(players);

      // P1 led 6 of Clubs
      state.addToTablePile({ playerId: 'p1', card: { suit: 'CLUBS', rank: 'SIX' } });
      state.setActiveRoundSuit('CLUBS');

      // Upcoming player P3 has a known void in CLUBS!
      state.getPlayerSuitVoids().get('p3')?.add('CLUBS');

      // Bot has 3 cards: 4 of Clubs, King of Clubs, and 2 of Diamonds
      bot.addCards([
        { suit: 'CLUBS', rank: 'FOUR' },   // Under-card (< 6)
        { suit: 'CLUBS', rank: 'KING' },   // Over-card (> 6)
        { suit: 'DIAMONDS', rank: 'TWO' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // If bot played King, it would become highest on pile and P3 would cut with Vettu,
      // penalizing the bot! Bot ducks with 4 of Clubs instead.
      expect(move).toEqual({ suit: 'CLUBS', rank: 'FOUR' });
    });

    it('should play the lowest over-card when forced to play higher than current pile', () => {
      const p1 = new Player('p1', 'P1', false);
      const bot = new Player('bot', 'Bot', true);
      const players = [p1, bot];
      const state = new GameState(players);

      // P1 led 4 of Hearts
      state.addToTablePile({ playerId: 'p1', card: { suit: 'HEARTS', rank: 'FOUR' } });
      state.setActiveRoundSuit('HEARTS');

      // Bot has only cards higher than 4: Seven, Jack, Ace of Hearts
      bot.addCards([
        { suit: 'HEARTS', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'JACK' },
        { suit: 'HEARTS', rank: 'ACE' },
        { suit: 'SPADES', rank: 'TWO' },
      ]);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Forced to play higher; plays lowest over-card (7 of Hearts) to minimize rank waste
      expect(move).toEqual({ suit: 'HEARTS', rank: 'SEVEN' });
    });
  });

  // =========================================================================
  // 4. Vettu / Cut Turn Decision Tests (Cannot Follow Suit)
  // =========================================================================
  describe('Vettu / Strike Turn Decisions', () => {
    it('should activate Target Revenge Mode and dump HIGHEST card when vulnerable player has <= 3 cards', () => {
      const vulnerablePlayer = new Player('vuln', 'Vulnerable Player', false);
      // Vulnerable player is down to 2 cards!
      vulnerablePlayer.addCards([
        { suit: 'HEARTS', rank: 'TWO' },
        { suit: 'HEARTS', rank: 'THREE' },
      ]);

      const bot = new Player('bot', 'Bot', true);
      bot.addCards([
        { suit: 'SPADES', rank: 'TWO' },
        { suit: 'CLUBS', rank: 'KING' },
        { suit: 'DIAMONDS', rank: 'ACE' }, // Highest card
      ]);

      const players = [vulnerablePlayer, bot];
      const state = new GameState(players);

      // Vulnerable player led King of Hearts
      state.addToTablePile({
        playerId: 'vuln',
        card: { suit: 'HEARTS', rank: 'KING' },
      });
      state.setActiveRoundSuit('HEARTS');

      // Bot has no Hearts -> Vettu opportunity!
      const move = botService.calculateBotMove(state, bot, players, []);

      // Because vulnerable player has <= 3 cards, bot enters Target Revenge Mode and dumps Ace of Diamonds!
      expect(move).toEqual({ suit: 'DIAMONDS', rank: 'ACE' });
    });

    it('should dump highest card when no singletons are in hand during normal Vettu', () => {
      const leader = new Player('leader', 'Leader', false);
      leader.addCards([
        { suit: 'HEARTS', rank: 'FIVE' },
        { suit: 'HEARTS', rank: 'SIX' },
        { suit: 'HEARTS', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'EIGHT' },
      ]); // Leader has > 3 cards -> No revenge mode

      const bot = new Player('bot', 'Bot', true);
      // Bot has pairs in Spades and Clubs (no singletons)
      bot.addCards([
        { suit: 'SPADES', rank: 'FOUR' },
        { suit: 'SPADES', rank: 'FIVE' },
        { suit: 'CLUBS', rank: 'TEN' },
        { suit: 'CLUBS', rank: 'JACK' },
      ]);

      const players = [leader, bot];
      const state = new GameState(players);

      state.addToTablePile({ playerId: 'leader', card: { suit: 'HEARTS', rank: 'NINE' } });
      state.setActiveRoundSuit('HEARTS');

      const move = botService.calculateBotMove(state, bot, players, []);
      // With no singletons, dumps the highest card in hand (Jack of Clubs)
      expect(move).toEqual({ suit: 'CLUBS', rank: 'JACK' });
    });

    it('should shed singletons during normal Vettu cut', () => {
      const leader = new Player('leader', 'Leader', false);
      leader.addCards([
        { suit: 'HEARTS', rank: 'FIVE' },
        { suit: 'HEARTS', rank: 'SIX' },
        { suit: 'HEARTS', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'EIGHT' },
      ]);

      const bot = new Player('bot', 'Bot', true);
      // Singleton: Ace of Diamonds. Pair: Spades 2 and Spades 3
      bot.addCards([
        { suit: 'DIAMONDS', rank: 'ACE' }, // Singleton
        { suit: 'SPADES', rank: 'TWO' },
        { suit: 'SPADES', rank: 'THREE' },
      ]);

      const players = [leader, bot];
      const state = new GameState(players);

      state.addToTablePile({ playerId: 'leader', card: { suit: 'HEARTS', rank: 'NINE' } });
      state.setActiveRoundSuit('HEARTS');

      // Mock Math.random to test 70% branch (shed singleton)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const move = botService.calculateBotMove(state, bot, players, []);
      expect(move).toEqual({ suit: 'DIAMONDS', rank: 'ACE' });

      vi.restoreAllMocks();
    });

    it('should slim down a 2-card suit into a singleton instead of dumping from a longer suit', () => {
      const leader = new Player('leader', 'Leader', false);
      leader.addCards([
        { suit: 'HEARTS', rank: 'FIVE' },
        { suit: 'HEARTS', rank: 'SIX' },
        { suit: 'HEARTS', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'EIGHT' },
      ]);

      const bot = new Player('bot', 'Bot', true);
      // Doubleton in Diamonds (2 cards), Long suit in Spades (4 cards)
      bot.addCards([
        { suit: 'DIAMONDS', rank: 'TEN' },
        { suit: 'DIAMONDS', rank: 'FOUR' },
        { suit: 'SPADES', rank: 'ACE' },
        { suit: 'SPADES', rank: 'KING' },
        { suit: 'SPADES', rank: 'EIGHT' },
        { suit: 'SPADES', rank: 'THREE' },
      ]);

      const players = [leader, bot];
      const state = new GameState(players);

      state.addToTablePile({ playerId: 'leader', card: { suit: 'HEARTS', rank: 'NINE' } });
      state.setActiveRoundSuit('HEARTS');

      const move = botService.calculateBotMove(state, bot, players, []);
      // Rather than dumping Ace of Spades from the 4-card suit, bot slims down the 2-card Diamonds suit
      // by playing 10 of Diamonds, creating a singleton 4 of Diamonds for a quick upcoming void!
      expect(move).toEqual({ suit: 'DIAMONDS', rank: 'TEN' });
    });

    it('should dump the higher card of a 2-card suit to preserve the low exit card', () => {
      const leader = new Player('leader', 'Leader', false);
      leader.addCards([
        { suit: 'HEARTS', rank: 'FIVE' },
        { suit: 'HEARTS', rank: 'SIX' },
        { suit: 'HEARTS', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'EIGHT' },
      ]);

      const bot = new Player('bot', 'Bot', true);
      // Doubleton in Clubs: King and 3
      bot.addCards([
        { suit: 'CLUBS', rank: 'KING' },
        { suit: 'CLUBS', rank: 'THREE' },
        { suit: 'SPADES', rank: 'EIGHT' },
        { suit: 'SPADES', rank: 'NINE' },
        { suit: 'SPADES', rank: 'TEN' },
      ]);

      const players = [leader, bot];
      const state = new GameState(players);

      state.addToTablePile({ playerId: 'leader', card: { suit: 'HEARTS', rank: 'NINE' } });
      state.setActiveRoundSuit('HEARTS');

      const move = botService.calculateBotMove(state, bot, players, []);
      // Dumps the heavier King of Clubs, keeping the low 3 of Clubs as an emergency exit card
      expect(move).toEqual({ suit: 'CLUBS', rank: 'KING' });
    });

    it('should pick the highest rank singleton when multiple singletons exist', () => {
      const leader = new Player('leader', 'Leader', false);
      leader.addCards([
        { suit: 'HEARTS', rank: 'FIVE' },
        { suit: 'HEARTS', rank: 'SIX' },
        { suit: 'HEARTS', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'EIGHT' },
      ]);

      const bot = new Player('bot', 'Bot', true);
      bot.addCards([
        { suit: 'SPADES', rank: 'QUEEN' },  // Singleton 1 (high rank)
        { suit: 'DIAMONDS', rank: 'FIVE' },  // Singleton 2 (lower rank)
        { suit: 'CLUBS', rank: 'FOUR' },     // Pair
        { suit: 'CLUBS', rank: 'SEVEN' },
      ]);

      const players = [leader, bot];
      const state = new GameState(players);

      state.addToTablePile({ playerId: 'leader', card: { suit: 'HEARTS', rank: 'NINE' } });
      state.setActiveRoundSuit('HEARTS');

      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const move = botService.calculateBotMove(state, bot, players, []);
      // Dumps Queen of Spades over 5 of Diamonds (higher singleton shedding heavier card)
      expect(move).toEqual({ suit: 'SPADES', rank: 'QUEEN' });

      vi.restoreAllMocks();
    });

    it('should slim down the shortest suit when only 3+ card suits exist', () => {
      const leader = new Player('leader', 'Leader', false);
      leader.addCards([
        { suit: 'HEARTS', rank: 'FIVE' },
        { suit: 'HEARTS', rank: 'SIX' },
        { suit: 'HEARTS', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'EIGHT' },
      ]);

      const bot = new Player('bot', 'Bot', true);
      // 3-card suit in Diamonds, 4-card suit in Spades
      bot.addCards([
        { suit: 'DIAMONDS', rank: 'JACK' },  // Highest of 3-card suit
        { suit: 'DIAMONDS', rank: 'SEVEN' },
        { suit: 'DIAMONDS', rank: 'FOUR' },
        { suit: 'SPADES', rank: 'ACE' },     // In 4-card suit
        { suit: 'SPADES', rank: 'KING' },
        { suit: 'SPADES', rank: 'EIGHT' },
        { suit: 'SPADES', rank: 'TWO' },
      ]);

      const players = [leader, bot];
      const state = new GameState(players);

      state.addToTablePile({ playerId: 'leader', card: { suit: 'HEARTS', rank: 'NINE' } });
      state.setActiveRoundSuit('HEARTS');

      const move = botService.calculateBotMove(state, bot, players, []);
      // Dumps Jack of Diamonds from shortest suit (length 3), moving closer to doubleton/singleton
      expect(move).toEqual({ suit: 'DIAMONDS', rank: 'JACK' });
    });
  });

  // =========================================================================
  // 5. Bot Personalities (Sofia, Leo, Jenny)
  // =========================================================================
  describe('Bot Personalities (Sofia, Leo, Jenny)', () => {
    it('resolveBotPersonality should identify personalities by player name, ID, or explicit type', () => {
      const pSofia = new Player('bot3', 'Sofia', true);
      const pLeo = new Player('bot2', 'Leo', true);
      const pJenny = new Player('bot1', 'Jenny', true);
      const pDefault = new Player('custom', 'Custom Bot', true);

      expect(resolveBotPersonality(pSofia)).toEqual(SOFIA_PERSONALITY);
      expect(resolveBotPersonality(pLeo)).toEqual(LEO_PERSONALITY);
      expect(resolveBotPersonality(pJenny)).toEqual(JENNY_PERSONALITY);
      expect(resolveBotPersonality(pDefault)).toEqual(JENNY_PERSONALITY);

      // Explicit string resolution
      expect(resolveBotPersonality(pDefault, 'sofia')).toEqual(SOFIA_PERSONALITY);
      expect(resolveBotPersonality(pDefault, 'leo')).toEqual(LEO_PERSONALITY);
      expect(resolveBotPersonality(pDefault, 'jenny')).toEqual(JENNY_PERSONALITY);
    });

    it('Leo should aggressively overtake trick in normal play while Sofia ducks safely', () => {
      const p1 = new Player('p1', 'Player 1', false);
      const sofia = new Player('bot3', 'Sofia', true);
      const leo = new Player('bot2', 'Leo', true);
      const p3 = new Player('p3', 'Player 3', false);
      const playersSofia = [p1, sofia, p3];
      const playersLeo = [p1, leo, p3];

      const stateSofia = new GameState(playersSofia);
      stateSofia.addToTablePile({ playerId: 'p1', card: { suit: 'CLUBS', rank: 'SEVEN' } });
      stateSofia.setActiveRoundSuit('CLUBS');

      const stateLeo = new GameState(playersLeo);
      stateLeo.addToTablePile({ playerId: 'p1', card: { suit: 'CLUBS', rank: 'SEVEN' } });
      stateLeo.setActiveRoundSuit('CLUBS');

      // Both hold: King of Clubs (> 7) and 4 of Clubs (< 7), plus 3 other off-suit cards (5 cards, normal play)
      const testCards = [
        { suit: 'CLUBS', rank: 'KING' },
        { suit: 'CLUBS', rank: 'FOUR' },
        { suit: 'SPADES', rank: 'TWO' },
        { suit: 'SPADES', rank: 'THREE' },
        { suit: 'SPADES', rank: 'FIVE' },
      ];

      sofia.addCards([...testCards]);
      leo.addCards([...testCards]);

      // Mock random to 0.5 (which triggers Leo's 0.70 overtake aggressiveness)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const sofiaMove = botService.calculateBotMove(stateSofia, sofia, playersSofia, []);
      const leoMove = botService.calculateBotMove(stateLeo, leo, playersLeo, []);

      // Sofia (Tactician) ducks safely with 4 of Clubs
      expect(sofiaMove).toEqual({ suit: 'CLUBS', rank: 'FOUR' });

      // Leo (Aggressive Gambler) overtakes trick with King of Clubs to seize the lead!
      expect(leoMove).toEqual({ suit: 'CLUBS', rank: 'KING' });

      vi.restoreAllMocks();
    });

    it('Leo should trigger endgame panic earlier at 4 cards while Sofia/Jenny stay in normal play', () => {
      const sofia = new Player('bot3', 'Sofia', true);
      const leo = new Player('bot2', 'Leo', true);
      const opponent = new Player('p1', 'Opponent', false);
      const playersSofia = [sofia, opponent];
      const playersLeo = [leo, opponent];

      const stateSofia = new GameState(playersSofia);
      const stateLeo = new GameState(playersLeo);

      // Both hold 4 cards (no voids on table)
      const fourCards = [
        { suit: 'SPADES', rank: 'TEN' },     // Highest safe card
        { suit: 'SPADES', rank: 'NINE' },
        { suit: 'DIAMONDS', rank: 'FOUR' },
        { suit: 'CLUBS', rank: 'TWO' },      // Lowest card (rank 2)
      ];

      sofia.addCards([...fourCards]);
      leo.addCards([...fourCards]);

      const sofiaMove = botService.calculateBotMove(stateSofia, sofia, playersSofia, []);
      const leoMove = botService.calculateBotMove(stateLeo, leo, playersLeo, []);

      // Sofia has panicThreshold 3: at 4 cards, normal play -> leads lowest card (2 of Clubs)
      expect(sofiaMove).toEqual({ suit: 'CLUBS', rank: 'TWO' });

      // Leo has panicThreshold 4: at 4 cards, early panic/attack mode -> leads highest safe card (10 of Spades)!
      expect(leoMove).toEqual({ suit: 'SPADES', rank: 'TEN' });
    });

    it('Leo should dare to set up borderline cut traps up to rank 8 while Sofia stays cautious (rank <= 7)', () => {
      const sofia = new Player('bot3', 'Sofia', true);
      const leo = new Player('bot2', 'Leo', true);
      const target = new Player('target', 'Target', false);
      target.addCards([
        { suit: 'SPADES', rank: 'TWO' },
        { suit: 'SPADES', rank: 'THREE' },
      ]); // Vulnerable target (2 cards)
      const cutter = new Player('cutter', 'Cutter', false);

      const playersSofia = [sofia, target, cutter];
      const playersLeo = [leo, target, cutter];

      const stateSofia = new GameState(playersSofia);
      stateSofia.getPlayerSuitVoids().get('cutter')?.add('HEARTS');

      const stateLeo = new GameState(playersLeo);
      stateLeo.getPlayerSuitVoids().get('cutter')?.add('HEARTS');

      // Both hold 8 of Hearts (borderline rank 8) and clean Clubs
      const cards = [
        { suit: 'HEARTS', rank: 'EIGHT' },  // Rank 8 trap card
        { suit: 'CLUBS', rank: 'FOUR' },    // Clean suit
        { suit: 'CLUBS', rank: 'FIVE' },
        { suit: 'CLUBS', rank: 'SIX' },
      ];

      sofia.addCards([...cards]);
      leo.addCards([...cards]);

      const sofiaMove = botService.calculateBotMove(stateSofia, sofia, playersSofia, []);
      const leoMove = botService.calculateBotMove(stateLeo, leo, playersLeo, []);

      // Sofia (trapMaxRank = 7): considers 8 too risky; leads safe 4 of Clubs
      expect(sofiaMove).toEqual({ suit: 'CLUBS', rank: 'FOUR' });

      // Leo (trapMaxRank = 8): aggressively springs the cut trap with 8 of Hearts!
      expect(leoMove).toEqual({ suit: 'HEARTS', rank: 'EIGHT' });
    });

    it('Sofia should strictly create voids during Vettu while Leo dumps highest cards to punish', () => {
      const leader = new Player('leader', 'Leader', false);
      leader.addCards([
        { suit: 'HEARTS', rank: 'FIVE' },
        { suit: 'HEARTS', rank: 'SIX' },
        { suit: 'HEARTS', rank: 'SEVEN' },
        { suit: 'HEARTS', rank: 'EIGHT' },
      ]); // Leader > 3 cards

      const sofia = new Player('bot3', 'Sofia', true);
      const leo = new Player('bot2', 'Leo', true);

      const playersSofia = [leader, sofia];
      const playersLeo = [leader, leo];

      const stateSofia = new GameState(playersSofia);
      stateSofia.addToTablePile({ playerId: 'leader', card: { suit: 'HEARTS', rank: 'NINE' } });
      stateSofia.setActiveRoundSuit('HEARTS');

      const stateLeo = new GameState(playersLeo);
      stateLeo.addToTablePile({ playerId: 'leader', card: { suit: 'HEARTS', rank: 'NINE' } });
      stateLeo.setActiveRoundSuit('HEARTS');

      // Both hold a singleton 3 of Spades, and 3 Diamonds with Ace of Diamonds
      const hand = [
        { suit: 'SPADES', rank: 'THREE' },   // Singleton (immediate void)
        { suit: 'DIAMONDS', rank: 'ACE' },   // Highest card overall
        { suit: 'DIAMONDS', rank: 'KING' },
        { suit: 'DIAMONDS', rank: 'TEN' },
      ];

      sofia.addCards([...hand]);
      leo.addCards([...hand]);

      // Mock random to 0.65:
      // For Sofia (rate 0.95): 0.65 < 0.95 -> sheds singleton 3 of Spades
      // For Leo (rate 0.50): 0.65 > 0.50 -> dumps Ace of Diamonds to crush the opponent!
      vi.spyOn(Math, 'random').mockReturnValue(0.65);

      const sofiaMove = botService.calculateBotMove(stateSofia, sofia, playersSofia, []);
      const leoMove = botService.calculateBotMove(stateLeo, leo, playersLeo, []);

      // Sofia creates the void with 3 of Spades
      expect(sofiaMove).toEqual({ suit: 'SPADES', rank: 'THREE' });

      // Leo dumps Ace of Diamonds to crush the opponent!
      expect(leoMove).toEqual({ suit: 'DIAMONDS', rank: 'ACE' });

      vi.restoreAllMocks();
    });

    it('shuffleBotSeats should return all 3 bot characters without loss or duplication', () => {
      expect(BOT_CHARACTERS).toEqual(['Jenny', 'Leo', 'Sofia']);
      const seats = shuffleBotSeats();
      expect(seats).toHaveLength(3);
      expect(seats.slice().sort()).toEqual(['Jenny', 'Leo', 'Sofia']);
    });

    it('shuffleBotSeats should produce randomized order over multiple runs', () => {
      const orderSignatures = new Set<string>();
      for (let i = 0; i < 30; i++) {
        orderSignatures.add(shuffleBotSeats().join(','));
      }
      // With 6 possible permutations (3!), across 30 runs there should be multiple distinct orderings
      expect(orderSignatures.size).toBeGreaterThan(1);
    });
  });

  // =========================================================================
  // 6. Error & Edge Case Tests
  // =========================================================================
  describe('Error & Guard Conditions', () => {
    it('should throw an error when bot hand is empty', () => {
      const bot = new Player('bot', 'Bot', true);
      const players = [bot];
      const state = new GameState(players);

      expect(() => botService.calculateBotMove(state, bot, players, [])).toThrow(
        'Bot hand is empty, cannot calculate move'
      );
    });

    it('should throw an error when table pile is not empty but activeRoundSuit is null', () => {
      const bot = new Player('bot', 'Bot', true);
      bot.addCard({ suit: 'SPADES', rank: 'TEN' });
      const players = [bot];
      const state = new GameState(players);

      // Force an inconsistent state: cards on pile but no active suit
      state.addToTablePile({ playerId: 'p1', card: { suit: 'SPADES', rank: 'FIVE' } });
      state.setActiveRoundSuit(null as any);

      expect(() => botService.calculateBotMove(state, bot, players, [])).toThrow(
        'Active round suit cannot be null when table pile is not empty'
      );
    });
  });
});
