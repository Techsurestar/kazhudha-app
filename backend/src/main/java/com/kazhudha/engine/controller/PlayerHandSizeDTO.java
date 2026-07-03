package com.kazhudha.engine.controller;

public record PlayerHandSizeDTO(
    String id,
    String name,
    int handSize,
    boolean isBot,
    boolean hasGottenAway
) {}
