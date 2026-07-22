package com.kazhudha.engine.service;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.GameState;
import com.kazhudha.engine.domain.Player;
import com.kazhudha.engine.domain.HandResult;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.HashMap;
import java.util.Map;

public class GameSession {
    private final String gameId;
    private final GameState gameState;
    private final List<Player> players;
    private final List<Card> discardedHistory;
    private final List<HandResult> hands;
    private volatile long lastAccessedTime;

    public GameSession(String gameId, GameState gameState, List<Player> players) {
        this.gameId = Objects.requireNonNull(gameId, "Game ID cannot be null");
        this.gameState = Objects.requireNonNull(gameState, "GameState cannot be null");
        this.players = Collections.unmodifiableList(new ArrayList<>(Objects.requireNonNull(players, "Players cannot be null")));
        this.discardedHistory = Collections.synchronizedList(new ArrayList<>());
        this.hands = Collections.synchronizedList(new ArrayList<>());
        this.lastAccessedTime = System.currentTimeMillis();
    }

    public String getGameId() {
        return gameId;
    }

    public GameState getGameState() {
        return gameState;
    }

    public List<Player> getPlayers() {
        return players;
    }

    public List<Card> getDiscardedHistory() {
        return discardedHistory;
    }

    public List<HandResult> getHands() {
        return Collections.unmodifiableList(hands);
    }

    public long getLastAccessedTime() {
        return lastAccessedTime;
    }

    public synchronized void touch() {
        this.lastAccessedTime = System.currentTimeMillis();
    }

    public synchronized void recordCurrentHand() {
        int handNumber = hands.size() + 1;
        List<String> escaped = gameState.getEscapedPlayerIds();
        
        String kazhudhaId = null;
        for (Player p : players) {
            if (!p.hasGottenAway()) {
                kazhudhaId = p.getId();
                break;
            }
        }
        
        Map<String, Integer> scores = new HashMap<>();
        for (Player p : players) {
            String pId = p.getId();
            int idx = escaped.indexOf(pId);
            if (idx == 0) {
                scores.put(pId, 20);
            } else if (idx == 1) {
                scores.put(pId, 15);
            } else if (idx == 2) {
                scores.put(pId, 10);
            } else {
                scores.put(pId, 0);
            }
        }
        
        String winnerId = escaped.isEmpty() ? null : escaped.get(0);
        HandResult result = new HandResult(handNumber, winnerId, scores, kazhudhaId);
        hands.add(result);
    }

    public synchronized boolean isTournamentOver() {
        Map<String, Integer> totals = new HashMap<>();
        for (HandResult hand : hands) {
            for (Map.Entry<String, Integer> entry : hand.scores().entrySet()) {
                totals.put(entry.getKey(), totals.getOrDefault(entry.getKey(), 0) + entry.getValue());
            }
        }
        for (int total : totals.values()) {
            if (total > 100) {
                return true;
            }
        }
        return false;
    }

    public synchronized void resetForNextHand(DealerService dealerService) {
        for (Player p : players) {
            p.clearHand();
            p.setHasGottenAway(false);
        }
        
        dealerService.shuffleAndDeal(players);
        String startingPlayerId = dealerService.determineStartingPlayer(players);
        
        gameState.clearTablePile();
        gameState.setActiveRoundSuit(null);
        gameState.setCurrentTurnPlayerId(startingPlayerId);
        gameState.clearEscapedPlayerIds();
        gameState.getPlayerSuitVoids().forEach((k, v) -> v.clear());
        
        this.discardedHistory.clear();
        this.lastAccessedTime = System.currentTimeMillis();
    }
}
