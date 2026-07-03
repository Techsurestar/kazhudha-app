package com.kazhudha.engine.domain;

public record GameEvent(
    String eventType,
    String playerId,
    Card card,
    String description
) {}
