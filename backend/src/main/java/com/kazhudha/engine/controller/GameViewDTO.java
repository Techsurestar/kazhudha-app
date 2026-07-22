package com.kazhudha.engine.controller;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.GameEvent;
import com.kazhudha.engine.domain.HandResult;
import com.kazhudha.engine.domain.PlayedCard;
import com.kazhudha.engine.domain.Suit;
import java.util.List;

public record GameViewDTO(
    List<PlayedCard> tablePile,
    Suit activeRoundSuit,
    String currentTurnPlayerId,
    List<Card> humanHand,
    List<PlayerHandSizeDTO> otherPlayers,
    boolean gameOver,
    String kazhudhaPlayerId,
    List<GameEvent> events,
    List<HandResult> hands,
    boolean tournamentOver
) {}
