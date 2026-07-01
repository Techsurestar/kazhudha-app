package com.kazhudha.engine.domain;

import java.util.Objects;

public record Card(Suit suit, Rank rank) {
    public Card {
        Objects.requireNonNull(suit, "Suit cannot be null");
        Objects.requireNonNull(rank, "Rank cannot be null");
    }

    @Override
    public String toString() {
        return rank.name() + " of " + suit;
    }
}
