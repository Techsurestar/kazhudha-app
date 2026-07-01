package com.kazhudha.engine.service;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.GameState;
import com.kazhudha.engine.domain.Player;
import com.kazhudha.engine.domain.Rank;
import com.kazhudha.engine.domain.Suit;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

        assertTrue(p4.getHand().isEmpty());
        assertTrue(p4.hasGottenAway());

        assertTrue(gameState.getTablePile().isEmpty());
        assertNull(gameState.getActiveRoundSuit());

        assertEquals("P1", gameState.getCurrentTurnPlayerId());
    }
}
