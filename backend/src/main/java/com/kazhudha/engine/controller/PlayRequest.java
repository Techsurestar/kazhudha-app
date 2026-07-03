package com.kazhudha.engine.controller;

import com.kazhudha.engine.domain.Card;

public record PlayRequest(String playerId, Card card) {}
