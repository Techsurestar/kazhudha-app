package com.kazhudha.engine.service;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.Player;
import com.kazhudha.engine.domain.Rank;
import com.kazhudha.engine.domain.Suit;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;

@Service
public class DealerService {

    public List<Card> createDeck() {
        List<Card> deck = new ArrayList<>(52);
        for (Suit suit : Suit.values()) {
            for (Rank rank : Rank.values()) {
                deck.add(new Card(suit, rank));
            }
        }
        return deck;
    }

    public void shuffleAndDeal(List<Player> players) {
        Objects.requireNonNull(players, "Players list cannot be null");
        if (players.size() != 4) {
            throw new IllegalArgumentException("The game requires exactly 4 players");
        }

        List<Card> deck = createDeck();
        Collections.shuffle(deck);

        for (Player player : players) {
            player.clearHand();
        }

        for (int i = 0; i < deck.size(); i++) {
            Player player = players.get(i % 4);
            player.addCard(deck.get(i));
        }
    }

    public String determineStartingPlayer(List<Player> players) {
        Objects.requireNonNull(players, "Players list cannot be null");
        Card aceOfSpades = new Card(Suit.SPADES, Rank.ACE);

        return players.stream()
                .filter(player -> player.getHand().contains(aceOfSpades))
                .map(Player::getId)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Ace of Spades (♠ of ACE) was not found in any player's hand"));
    }
}
