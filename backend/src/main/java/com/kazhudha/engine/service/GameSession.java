package com.kazhudha.engine.service;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.GameState;
import com.kazhudha.engine.domain.Player;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public class GameSession {
    private final String gameId;
    private final GameState gameState;
    private final List<Player> players;
    private final List<Card> discardedHistory;
    private volatile long lastAccessedTime;

    public GameSession(String gameId, GameState gameState, List<Player> players) {
        this.gameId = Objects.requireNonNull(gameId, "Game ID cannot be null");
        this.gameState = Objects.requireNonNull(gameState, "GameState cannot be null");
        this.players = Collections.unmodifiableList(new ArrayList<>(Objects.requireNonNull(players, "Players cannot be null")));
        this.discardedHistory = Collections.synchronizedList(new ArrayList<>());
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

    public long getLastAccessedTime() {
        return lastAccessedTime;
    }

    public synchronized void touch() {
        this.lastAccessedTime = System.currentTimeMillis();
    }
}
