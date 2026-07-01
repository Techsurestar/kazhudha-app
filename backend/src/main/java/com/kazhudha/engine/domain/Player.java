package com.kazhudha.engine.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public final class Player {
    private final String id;
    private final String name;
    private final List<Card> hand;
    private final boolean isBot;
    private boolean hasGottenAway;

    public Player(String id, String name, boolean isBot) {
        this.id = Objects.requireNonNull(id, "Player ID cannot be null");
        this.name = Objects.requireNonNull(name, "Player name cannot be null");
        this.hand = new ArrayList<>();
        this.isBot = isBot;
        this.hasGottenAway = false;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<Card> getHand() {
        return Collections.unmodifiableList(hand);
    }

    public boolean isBot() {
        return isBot;
    }

    public boolean hasGottenAway() {
        return hasGottenAway;
    }

    public void setHasGottenAway(boolean hasGottenAway) {
        this.hasGottenAway = hasGottenAway;
    }

    public void addCard(Card card) {
        Objects.requireNonNull(card, "Cannot add a null card to player hand");
        hand.add(card);
    }

    public void addCards(List<Card> cards) {
        Objects.requireNonNull(cards, "Cannot add a null list of cards");
        for (Card card : cards) {
            addCard(card);
        }
    }

    public boolean removeCard(Card card) {
        Objects.requireNonNull(card, "Cannot remove a null card");
        return hand.remove(card);
    }

    public void clearHand() {
        hand.clear();
    }
}
