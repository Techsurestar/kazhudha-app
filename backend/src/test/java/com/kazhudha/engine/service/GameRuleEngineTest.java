package com.kazhudha.engine.service;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.GameState;
import com.kazhudha.engine.domain.PlayedCard;
import com.kazhudha.engine.domain.Player;
import com.kazhudha.engine.domain.Rank;
import com.kazhudha.engine.domain.Suit;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class GameRuleEngineTest {

    @Test
    public void testRoundLifecycleAndVettuResolution() {
        Player p1 = new Player("P1", "Player 1", false);
        Player p2 = new Player("P2", "Player 2", false);
        Player p3 = new Player("P3", "Player 3", false);
        Player p4 = new Player("P4", "Player 4", false);

        Card p1Card = new Card(Suit.SPADES, Rank.ACE);
        Card p2Card = new Card(Suit.SPADES, Rank.TEN);
        Card p3Card = new Card(Suit.SPADES, Rank.KING);
        Card p4Card = new Card(Suit.HEARTS, Rank.ACE);

        p1.addCard(p1Card);
        p2.addCard(p2Card);
        p3.addCard(p3Card);
        p4.addCard(p4Card);

        List<Player> players = List.of(p1, p2, p3, p4);

        GameState gameState = new GameState(players);
        gameState.setCurrentTurnPlayerId("P1");

        GameRuleEngine gameRuleEngine = new GameRuleEngine();

        gameRuleEngine.validateAndPlayCard(gameState, "P1", p1Card);
        assertEquals(Suit.SPADES, gameState.getActiveRoundSuit());
        assertEquals(1, gameState.getTablePile().size());
        assertEquals(p1Card, gameState.getTablePile().get(0).card());
        assertEquals("P1", gameState.getTablePile().get(0).playerId());
        gameRuleEngine.advanceTurn(gameState, players);
        assertEquals("P2", gameState.getCurrentTurnPlayerId());

        gameRuleEngine.validateAndPlayCard(gameState, "P2", p2Card);
        assertEquals(Suit.SPADES, gameState.getActiveRoundSuit());
        assertEquals(2, gameState.getTablePile().size());
        assertEquals(p2Card, gameState.getTablePile().get(1).card());
        assertEquals("P2", gameState.getTablePile().get(1).playerId());
        gameRuleEngine.advanceTurn(gameState, players);
        assertEquals("P3", gameState.getCurrentTurnPlayerId());

        gameRuleEngine.validateAndPlayCard(gameState, "P3", p3Card);
        assertEquals(Suit.SPADES, gameState.getActiveRoundSuit());
        assertEquals(3, gameState.getTablePile().size());
        assertEquals(p3Card, gameState.getTablePile().get(2).card());
        assertEquals("P3", gameState.getTablePile().get(2).playerId());
        gameRuleEngine.advanceTurn(gameState, players);
        assertEquals("P4", gameState.getCurrentTurnPlayerId());

        gameRuleEngine.validateAndPlayCard(gameState, "P4", p4Card);

        assertEquals(4, p1.getHand().size());
        assertTrue(p1.getHand().contains(p1Card));
        assertTrue(p1.getHand().contains(p2Card));
        assertTrue(p1.getHand().contains(p3Card));
        assertTrue(p1.getHand().contains(p4Card));
        // Resetting gotten away status
        org.junit.jupiter.api.Assertions.assertFalse(p1.hasGottenAway());

        assertTrue(p4.getHand().isEmpty());
        assertTrue(p4.hasGottenAway());

        assertTrue(gameState.getTablePile().isEmpty());
        assertNull(gameState.getActiveRoundSuit());

        assertEquals("P1", gameState.getCurrentTurnPlayerId());
    }

    @Test
    public void testSuitMemoryTrackerAndBotAiSelection() {
        // Setup 4 players
        Player human = new Player("human", "Player 1", false);
        Player bot1 = new Player("bot1", "Bot 1", true);
        Player bot2 = new Player("bot2", "Bot 2", true);
        Player bot3 = new Player("bot3", "Bot 3", true);

        // human has HEARTS ACE
        Card hCard = new Card(Suit.HEARTS, Rank.ACE);
        human.addCard(hCard);

        // bot1 has CLUBS TWO and SPADES THREE
        Card b1Card1 = new Card(Suit.CLUBS, Rank.TWO);
        Card b1Card2 = new Card(Suit.SPADES, Rank.THREE);
        bot1.addCard(b1Card1);
        bot1.addCard(b1Card2);

        // bot2 has CLUBS TEN
        Card b2Card = new Card(Suit.CLUBS, Rank.TEN);
        bot2.addCard(b2Card);

        // bot3 has CLUBS KING
        Card b3Card = new Card(Suit.CLUBS, Rank.KING);
        bot3.addCard(b3Card);

        List<Player> players = List.of(human, bot1, bot2, bot3);
        GameState state = new GameState(players);
        GameRuleEngine gameRuleEngine = new GameRuleEngine();
        BotService botService = new BotService();

        // 1. Initial State: Voids are empty
        assertTrue(state.getPlayerSuitVoids().get("human").isEmpty());
        assertTrue(state.getPlayerSuitVoids().get("bot1").isEmpty());

        // 2. Play cards to trigger Vettu.
        // Lead CLUBS.
        state.setCurrentTurnPlayerId("bot1");
        gameRuleEngine.validateAndPlayCard(state, "bot1", b1Card1); // bot1 plays CLUBS TWO
        gameRuleEngine.advanceTurn(state, players);

        gameRuleEngine.validateAndPlayCard(state, "bot2", b2Card); // bot2 plays CLUBS TEN
        gameRuleEngine.advanceTurn(state, players);

        gameRuleEngine.validateAndPlayCard(state, "bot3", b3Card); // bot3 plays CLUBS KING
        gameRuleEngine.advanceTurn(state, players);

        // human doesn't have CLUBS, plays HEARTS ACE. Vettu!
        // bot3 played CLUBS KING (highest) and will be penalized.
        gameRuleEngine.validateAndPlayCard(state, "human", hCard);

        // 3. Assert Voids after Vettu:
        // human cut on CLUBS, so human is VOID of CLUBS.
        assertTrue(state.getPlayerSuitVoids().get("human").contains(Suit.CLUBS));

        // bot3 was penalized and got the table pile.
        // Distinct suits in pile: CLUBS and HEARTS.
        assertTrue(bot3.getHand().contains(b1Card1));
        assertTrue(bot3.getHand().contains(b2Card));
        assertTrue(bot3.getHand().contains(b3Card));
        assertTrue(bot3.getHand().contains(hCard));

        // Let's manually add HEARTS to bot3's void list and then verify it gets removed upon pile inheritance.
        GameState state2 = new GameState(players);
        state2.setActiveRoundSuit(Suit.HEARTS);
        state2.addToTablePile(new PlayedCard("bot3", new Card(Suit.HEARTS, Rank.FIVE)));
        state2.addToTablePile(new PlayedCard("human", new Card(Suit.SPADES, Rank.TWO))); // human broke suit
        state2.getPlayerSuitVoids().get("bot3").add(Suit.HEARTS);
        state2.getPlayerSuitVoids().get("bot3").add(Suit.SPADES);

        // bot3 void has HEARTS. We call handleVettuCondition:
        gameRuleEngine.handleVettuCondition(state2, players, human, new Card(Suit.SPADES, Rank.TWO));
        // bot3 got penalized, pile had HEARTS and SPADES.
        // So HEARTS and SPADES should be removed from bot3's void list.
        assertFalse(state2.getPlayerSuitVoids().get("bot3").contains(Suit.HEARTS));
        assertFalse(state2.getPlayerSuitVoids().get("bot3").contains(Suit.SPADES));

        // 4. Test Bot AI Selection:
        // Create new active players to ensure they haven't gotten away
        Player p_human = new Player("human", "Player 1", false);
        Player p_bot1 = new Player("bot1", "Bot 1", true);
        Player p_bot2 = new Player("bot2", "Bot 2", true);
        Player p_bot3 = new Player("bot3", "Bot 3", true);

        p_human.addCard(new Card(Suit.SPADES, Rank.ACE));
        p_bot2.addCard(new Card(Suit.HEARTS, Rank.TEN));
        p_bot3.addCard(new Card(Suit.DIAMONDS, Rank.FIVE));

        Card clubsCard = new Card(Suit.CLUBS, Rank.NINE);
        Card spadesCard = new Card(Suit.SPADES, Rank.FOUR);
        p_bot1.addCard(clubsCard);
        p_bot1.addCard(spadesCard);

        List<Player> leadPlayers = List.of(p_human, p_bot1, p_bot2, p_bot3);
        GameState leadState = new GameState(leadPlayers);
        leadState.getPlayerSuitVoids().get("bot2").add(Suit.CLUBS);

        Card chosen = botService.calculateBotMove(leadState, p_bot1, leadPlayers, List.of());
        assertEquals(spadesCard, chosen); // Bot chose SPADES over CLUBS because next player is void of CLUBS!
    }
}
