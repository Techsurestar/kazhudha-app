import { describe, it, expect } from 'vitest';
import {
  Card,
  Player,
  GameState,
  GameRuleEngine,
  BotService,
  createDeck,
  shuffleAndDeal,
  determineStartingPlayer,
  cardEquals,
  handContains,
} from '../index.js';

describe('GameRuleEngine', () => {
  it('testRoundLifecycleAndVettuResolution', () => {
    const p1 = new Player('P1', 'Player 1', false);
    const p2 = new Player('P2', 'Player 2', false);
    const p3 = new Player('P3', 'Player 3', false);
    const p4 = new Player('P4', 'Player 4', false);

    const p1Card: Card = { suit: 'SPADES', rank: 'ACE' };
    const p2Card: Card = { suit: 'SPADES', rank: 'TEN' };
    const p3Card: Card = { suit: 'SPADES', rank: 'KING' };
    const p4Card: Card = { suit: 'HEARTS', rank: 'ACE' };

    p1.addCard(p1Card);
    p2.addCard(p2Card);
    p3.addCard(p3Card);
    p4.addCard(p4Card);

    const players = [p1, p2, p3, p4];

    const gameState = new GameState(players);
    gameState.setCurrentTurnPlayerId('P1');

    const gameRuleEngine = new GameRuleEngine();

    gameRuleEngine.validateAndPlayCard(gameState, 'P1', p1Card);
    expect(gameState.getActiveRoundSuit()).toBe('SPADES');
    expect(gameState.getTablePile().length).toBe(1);
    expect(cardEquals(gameState.getTablePile()[0].card, p1Card)).toBe(true);
    expect(gameState.getTablePile()[0].playerId).toBe('P1');
    gameRuleEngine.advanceTurn(gameState, players);
    expect(gameState.getCurrentTurnPlayerId()).toBe('P2');

    gameRuleEngine.validateAndPlayCard(gameState, 'P2', p2Card);
    expect(gameState.getActiveRoundSuit()).toBe('SPADES');
    expect(gameState.getTablePile().length).toBe(2);
    expect(cardEquals(gameState.getTablePile()[1].card, p2Card)).toBe(true);
    expect(gameState.getTablePile()[1].playerId).toBe('P2');
    gameRuleEngine.advanceTurn(gameState, players);
    expect(gameState.getCurrentTurnPlayerId()).toBe('P3');

    gameRuleEngine.validateAndPlayCard(gameState, 'P3', p3Card);
    expect(gameState.getActiveRoundSuit()).toBe('SPADES');
    expect(gameState.getTablePile().length).toBe(3);
    expect(cardEquals(gameState.getTablePile()[2].card, p3Card)).toBe(true);
    expect(gameState.getTablePile()[2].playerId).toBe('P3');
    gameRuleEngine.advanceTurn(gameState, players);
    expect(gameState.getCurrentTurnPlayerId()).toBe('P4');

    // P4 cuts with HEARTS ACE -> Vettu!
    gameRuleEngine.validateAndPlayCard(gameState, 'P4', p4Card);

    expect(p1.getHand().length).toBe(4);
    expect(handContains(p1.getHand(), p1Card)).toBe(true);
    expect(handContains(p1.getHand(), p2Card)).toBe(true);
    expect(handContains(p1.getHand(), p3Card)).toBe(true);
    expect(handContains(p1.getHand(), p4Card)).toBe(true);
    expect(p1.hasGottenAway()).toBe(false);

    expect(p4.getHand().length).toBe(0);
    expect(p4.hasGottenAway()).toBe(true);

    expect(gameState.getTablePile().length).toBe(0);
    expect(gameState.getActiveRoundSuit()).toBeNull();
    expect(gameState.getCurrentTurnPlayerId()).toBe('P1');
  });

  it('testSuitMemoryTrackerAndBotAiSelection', () => {
    const human = new Player('human', 'Player 1', false);
    const bot1 = new Player('bot1', 'Bot 1', true);
    const bot2 = new Player('bot2', 'Bot 2', true);
    const bot3 = new Player('bot3', 'Bot 3', true);

    const hCard: Card = { suit: 'HEARTS', rank: 'ACE' };
    human.addCard(hCard);

    const b1Card1: Card = { suit: 'CLUBS', rank: 'TWO' };
    const b1Card2: Card = { suit: 'SPADES', rank: 'THREE' };
    bot1.addCard(b1Card1);
    bot1.addCard(b1Card2);

    const b2Card: Card = { suit: 'CLUBS', rank: 'TEN' };
    bot2.addCard(b2Card);

    const b3Card: Card = { suit: 'CLUBS', rank: 'KING' };
    bot3.addCard(b3Card);

    const players = [human, bot1, bot2, bot3];
    const state = new GameState(players);
    const gameRuleEngine = new GameRuleEngine();
    const botService = new BotService();

    // 1. Initial State: Voids are empty
    expect(state.getPlayerSuitVoids().get('human')?.size).toBe(0);
    expect(state.getPlayerSuitVoids().get('bot1')?.size).toBe(0);

    // 2. Play cards to trigger Vettu.
    state.setCurrentTurnPlayerId('bot1');
    gameRuleEngine.validateAndPlayCard(state, 'bot1', b1Card1);
    gameRuleEngine.advanceTurn(state, players);

    gameRuleEngine.validateAndPlayCard(state, 'bot2', b2Card);
    gameRuleEngine.advanceTurn(state, players);

    gameRuleEngine.validateAndPlayCard(state, 'bot3', b3Card);
    gameRuleEngine.advanceTurn(state, players);

    // human plays HEARTS ACE -> Vettu!
    gameRuleEngine.validateAndPlayCard(state, 'human', hCard);

    // 3. Assert Voids after Vettu:
    expect(state.getPlayerSuitVoids().get('human')?.has('CLUBS')).toBe(true);

    // bot3 was penalized and got the table pile
    expect(handContains(bot3.getHand(), b1Card1)).toBe(true);
    expect(handContains(bot3.getHand(), b2Card)).toBe(true);
    expect(handContains(bot3.getHand(), b3Card)).toBe(true);
    expect(handContains(bot3.getHand(), hCard)).toBe(true);

    // Test void removal upon pile inheritance
    const state2 = new GameState(players);
    state2.setActiveRoundSuit('HEARTS');
    state2.addToTablePile({ playerId: 'bot3', card: { suit: 'HEARTS', rank: 'FIVE' } });
    state2.addToTablePile({ playerId: 'human', card: { suit: 'SPADES', rank: 'TWO' } });
    state2.getPlayerSuitVoids().get('bot3')?.add('HEARTS');
    state2.getPlayerSuitVoids().get('bot3')?.add('SPADES');

    gameRuleEngine.handleVettuCondition(
      state2,
      players,
      human,
      { suit: 'SPADES', rank: 'TWO' }
    );
    expect(state2.getPlayerSuitVoids().get('bot3')?.has('HEARTS')).toBe(false);
    expect(state2.getPlayerSuitVoids().get('bot3')?.has('SPADES')).toBe(false);

    // 4. Test Bot AI Selection:
    const p_human = new Player('human', 'Player 1', false);
    const p_bot1 = new Player('bot1', 'Bot 1', true);
    const p_bot2 = new Player('bot2', 'Bot 2', true);
    const p_bot3 = new Player('bot3', 'Bot 3', true);

    p_human.addCard({ suit: 'SPADES', rank: 'ACE' });
    p_bot2.addCard({ suit: 'HEARTS', rank: 'TEN' });
    p_bot3.addCard({ suit: 'DIAMONDS', rank: 'FIVE' });

    const clubsCard: Card = { suit: 'CLUBS', rank: 'NINE' };
    const spadesCard: Card = { suit: 'SPADES', rank: 'FOUR' };
    p_bot1.addCard(clubsCard);
    p_bot1.addCard(spadesCard);

    const leadPlayers = [p_human, p_bot1, p_bot2, p_bot3];
    const leadState = new GameState(leadPlayers);
    leadState.getPlayerSuitVoids().get('bot2')?.add('CLUBS');

    const chosen = botService.calculateBotMove(leadState, p_bot1, leadPlayers, []);
    expect(cardEquals(chosen, spadesCard)).toBe(true);
  });

  it('testDealerDeckCreationAndDeal', () => {
    const deck = createDeck();
    expect(deck.length).toBe(52);

    const p1 = new Player('p1', 'P1', false);
    const p2 = new Player('p2', 'P2', true);
    const p3 = new Player('p3', 'P3', true);
    const p4 = new Player('p4', 'P4', true);
    const players = [p1, p2, p3, p4];

    shuffleAndDeal(players);
    expect(p1.getHand().length).toBe(13);
    expect(p2.getHand().length).toBe(13);
    expect(p3.getHand().length).toBe(13);
    expect(p4.getHand().length).toBe(13);

    const startingPlayerId = determineStartingPlayer(players);
    const startingPlayer = players.find((p) => p.getId() === startingPlayerId);
    expect(startingPlayer).toBeDefined();
    expect(handContains(startingPlayer!.getHand(), { suit: 'SPADES', rank: 'ACE' })).toBe(true);
  });

  it('testNormalTrickCompletion', () => {
    const p1 = new Player('p1', 'Player 1', false);
    const p2 = new Player('p2', 'Player 2', true);
    const p3 = new Player('p3', 'Player 3', true);
    const p4 = new Player('p4', 'Player 4', true);

    // Give each player 2 cards so nobody has gotten away yet
    const c1: Card = { suit: 'DIAMONDS', rank: 'FIVE' };
    const c2: Card = { suit: 'DIAMONDS', rank: 'KING' }; // Highest
    const c3: Card = { suit: 'DIAMONDS', rank: 'EIGHT' };
    const c4: Card = { suit: 'DIAMONDS', rank: 'TWO' };

    p1.addCards([c1, { suit: 'SPADES', rank: 'TWO' }]);
    p2.addCards([c2, { suit: 'SPADES', rank: 'THREE' }]);
    p3.addCards([c3, { suit: 'SPADES', rank: 'FOUR' }]);
    p4.addCards([c4, { suit: 'SPADES', rank: 'FIVE' }]);

    const players = [p1, p2, p3, p4];
    const state = new GameState(players);
    state.setCurrentTurnPlayerId('p1');
    const engine = new GameRuleEngine();
    const discarded: Card[] = [];

    engine.validateAndPlayCard(state, 'p1', c1);
    engine.advanceTurn(state, players);
    engine.validateAndPlayCard(state, 'p2', c2);
    engine.advanceTurn(state, players);
    engine.validateAndPlayCard(state, 'p3', c3);
    engine.advanceTurn(state, players);
    engine.validateAndPlayCard(state, 'p4', c4);

    expect(state.getTablePile().length).toBe(4);
    engine.resolveCompletedTrick(state, discarded, players);

    // Highest card was c2 played by p2
    expect(state.getCurrentTurnPlayerId()).toBe('p2');
    expect(discarded.length).toBe(4);
    expect(state.getTablePile().length).toBe(0);
    expect(state.getActiveRoundSuit()).toBeNull();
  });
});
