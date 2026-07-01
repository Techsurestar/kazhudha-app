package com.kazhudha.engine.domain;

import java.util.Objects;

public record PlayedCard(String playerId, Card card) {
    public PlayedCard {
        Objects.requireNonNull(playerId, "Player ID cannot be null");
        Objects.requireNonNull(card, "Card cannot be null");
    }
}
