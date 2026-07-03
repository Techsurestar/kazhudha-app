package com.kazhudha.engine.service;

import com.kazhudha.engine.domain.GameState;
import com.kazhudha.engine.domain.Player;
import com.kazhudha.engine.exception.SessionNotFoundException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameSessionManager {

    private final ConcurrentHashMap<String, GameSession> sessionMap = new ConcurrentHashMap<>();

    public GameSession createSession(String gameId, GameState state, List<Player> players) {
        Objects.requireNonNull(gameId, "Game ID cannot be null");
        Objects.requireNonNull(state, "GameState cannot be null");
        Objects.requireNonNull(players, "Players list cannot be null");

        GameSession session = new GameSession(gameId, state, players);
        sessionMap.put(gameId, session);
        return session;
    }

    public GameSession getSession(String gameId) {
        Objects.requireNonNull(gameId, "Game ID cannot be null");
        GameSession session = sessionMap.get(gameId);
        if (session == null) {
            throw new SessionNotFoundException("Session with ID " + gameId + " not found");
        }
        session.touch();
        return session;
    }

    public void updateSession(String gameId, GameSession session) {
        Objects.requireNonNull(gameId, "Game ID cannot be null");
        Objects.requireNonNull(session, "GameSession cannot be null");

        sessionMap.put(gameId, session);
        session.touch();
    }

    public void terminateSession(String gameId) {
        Objects.requireNonNull(gameId, "Game ID cannot be null");
        sessionMap.remove(gameId);
    }

    @Scheduled(fixedRate = 3600000)
    public void cleanupStaleSessions() {
        long now = System.currentTimeMillis();
        long threshold = 3600000; // 1 hour in milliseconds

        sessionMap.entrySet().removeIf(entry -> {
            boolean stale = (now - entry.getValue().getLastAccessedTime()) > threshold;
            return stale;
        });
    }
}
