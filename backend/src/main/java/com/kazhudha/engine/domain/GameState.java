package com.kazhudha.engine.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

public class GameState {
    private final List<Player> players;
    private final Map<String, Player> playerMap;
    private final List<PlayedCard> tablePile;
    private final Map<String, Set<Suit>> playerSuitVoids;
    private String currentTurnPlayerId;
    private Suit activeRoundSuit;

    public GameState(List<Player> players) {
        this.players = new ArrayList<>(players);
        this.playerMap = players.stream()
                .collect(Collectors.toConcurrentMap(Player::getId, Function.identity()));
        this.tablePile = Collections.synchronizedList(new ArrayList<>());
        this.activeRoundSuit = null;
        this.playerSuitVoids = new ConcurrentHashMap<>();
        for (Player p : players) {
            this.playerSuitVoids.put(p.getId(), ConcurrentHashMap.newKeySet());
        }
    }

    public List<Player> getPlayers() {
        return Collections.unmodifiableList(players);
    }

    public Player getPlayer(String playerId) {
        return playerMap.get(playerId);
    }

    public List<PlayedCard> getTablePile() {
        return Collections.unmodifiableList(tablePile);
    }

    public void addToTablePile(PlayedCard playedCard) {
        tablePile.add(playedCard);
    }

    public void clearTablePile() {
        tablePile.clear();
    }

    public String getCurrentTurnPlayerId() {
        return currentTurnPlayerId;
    }

    public void setCurrentTurnPlayerId(String currentTurnPlayerId) {
        this.currentTurnPlayerId = currentTurnPlayerId;
    }

    public Suit getActiveRoundSuit() {
        return activeRoundSuit;
    }

    public void setActiveRoundSuit(Suit activeRoundSuit) {
        this.activeRoundSuit = activeRoundSuit;
    }

    public Map<String, Set<Suit>> getPlayerSuitVoids() {
        return playerSuitVoids;
    }
}
