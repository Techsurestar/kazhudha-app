package com.kazhudha.engine.domain;

import java.util.Map;

public record HandResult(
    int handNumber,
    String winnerId,
    Map<String, Integer> scores,
    String kazhudhaPlayerId
) {}
