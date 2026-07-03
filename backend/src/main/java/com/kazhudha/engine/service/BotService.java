package com.kazhudha.engine.service;

import com.kazhudha.engine.domain.Card;
import com.kazhudha.engine.domain.GameState;
import com.kazhudha.engine.domain.PlayedCard;
import com.kazhudha.engine.domain.Player;
import com.kazhudha.engine.domain.Rank;
import com.kazhudha.engine.domain.Suit;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

@Service
public class BotService {

    public Card calculateBotMove(GameState state, Player botPlayer, List<Player> allPlayers, List<Card> discardedHistory) {
        Objects.requireNonNull(state, "GameState cannot be null");
        Objects.requireNonNull(botPlayer, "Player cannot be null");
        Objects.requireNonNull(allPlayers, "All players list cannot be null");
        Objects.requireNonNull(discardedHistory, "Discarded history cannot be null");

        List<Card> hand = botPlayer.getHand();
        if (hand.isEmpty()) {
            throw new IllegalStateException("Bot hand is empty, cannot calculate move");
        }

        // Scenario A: Table pile is empty
        if (state.getTablePile().isEmpty()) {
            return chooseLeadCard(state, botPlayer, allPlayers, discardedHistory);
        }

        // Scenario B: Table pile is not empty
        Suit activeSuit = state.getActiveRoundSuit();
        if (activeSuit == null) {
            throw new IllegalStateException("Active round suit cannot be null when table pile is not empty");
        }

        List<Card> matchingCards = hand.stream()
                .filter(c -> c.suit() == activeSuit)
                .toList();

        // Step 2: Must Follow Suit
        if (!matchingCards.isEmpty()) {
            return matchingCards.stream()
                    .min(Comparator.comparingInt(c -> c.rank().getValue()))
                    .orElseThrow();
        }

        // Step 3: Execute Vettu with Probabilistic Choice or Revenge Targeting
        PlayedCard highestActivePlayed = state.getTablePile().stream()
                .filter(pc -> pc.card().suit() == activeSuit)
                .max(Comparator.comparingInt(pc -> pc.card().rank().getValue()))
                .orElse(null);

        boolean targetRevengeMode = false;
        if (highestActivePlayed != null) {
            String vulnerablePlayerId = highestActivePlayed.playerId();
            Player vulnerablePlayer = allPlayers.stream()
                    .filter(p -> p.getId().equals(vulnerablePlayerId))
                    .findFirst()
                    .orElse(null);

            if (vulnerablePlayer != null && vulnerablePlayer.getHand().size() <= 3) {
                targetRevengeMode = true;
            }
        }

        // Vettu Revenge Targeting
        if (targetRevengeMode) {
            return hand.stream()
                    .max(Comparator.comparingInt(c -> c.rank().getValue()))
                    .orElseThrow();
        }

        // Standard singleton logic
        Map<Suit, List<Card>> groupedBySuit = hand.stream()
                .collect(Collectors.groupingBy(Card::suit));

        List<Card> singletons = groupedBySuit.values().stream()
                .filter(list -> list.size() == 1)
                .flatMap(List::stream)
                .toList();

        if (singletons.isEmpty()) {
            return hand.stream()
                    .max(Comparator.comparingInt(c -> c.rank().getValue()))
                    .orElseThrow();
        }

        double probability = ThreadLocalRandom.current().nextDouble();
        if (probability < 0.70) {
            return singletons.stream()
                    .max(Comparator.comparingInt(c -> c.rank().getValue()))
                    .orElseThrow();
        } else {
            List<Card> nonSingletons = groupedBySuit.values().stream()
                    .filter(list -> list.size() > 1)
                    .flatMap(List::stream)
                    .toList();

            if (!nonSingletons.isEmpty()) {
                return nonSingletons.stream()
                        .max(Comparator.comparingInt(c -> c.rank().getValue()))
                        .orElseThrow();
            }

            return singletons.stream()
                    .max(Comparator.comparingInt(c -> c.rank().getValue()))
                    .orElseThrow();
        }
    }

    private boolean isHighestRemainingOfSuit(Card card, List<Card> hand, List<Card> discardedHistory) {
        int cardValue = card.rank().getValue();
        for (Rank rank : Rank.values()) {
            if (rank.getValue() > cardValue) {
                Card higherCard = new Card(card.suit(), rank);
                if (!hand.contains(higherCard) && !discardedHistory.contains(higherCard)) {
                    return false;
                }
            }
        }
        return true;
    }

    private Card chooseLeadCard(GameState state, Player botPlayer, List<Player> allPlayers, List<Card> discardedHistory) {
        List<Card> hand = botPlayer.getHand();
        List<Card> cardsToConsider = hand;

        Player nextPlayer = getNextActivePlayer(botPlayer, allPlayers);
        if (nextPlayer != null) {
            Set<Suit> voids = state.getPlayerSuitVoids().get(nextPlayer.getId());
            if (voids != null && !voids.isEmpty()) {
                Set<Suit> suitsInHand = hand.stream().map(Card::suit).collect(Collectors.toSet());
                if (suitsInHand.size() > 1) {
                    List<Card> nonVoidCards = hand.stream()
                            .filter(c -> !voids.contains(c.suit()))
                            .toList();
                    if (!nonVoidCards.isEmpty()) {
                        cardsToConsider = nonVoidCards;
                    }
                }
            }
        }

        Map<Suit, List<Card>> groupedBySuit = cardsToConsider.stream()
                .collect(Collectors.groupingBy(Card::suit));

        // Define safe cards: avoid single high-card traps (Rank > 10)
        List<Card> safeCards = cardsToConsider.stream()
                .filter(c -> !(groupedBySuit.containsKey(c.suit()) && groupedBySuit.get(c.suit()).size() == 1 && c.rank().getValue() > 10))
                .toList();

        List<Card> candidates = safeCards.isEmpty() ? cardsToConsider : safeCards;

        // Avoid leading with a Weapon Card if possible
        List<Card> nonWeaponCandidates = candidates.stream()
                .filter(c -> !isHighestRemainingOfSuit(c, hand, discardedHistory))
                .toList();

        List<Card> finalCandidates = nonWeaponCandidates.isEmpty() ? candidates : nonWeaponCandidates;

        // End-Game Panic Mode (Table Lead)
        if (hand.size() <= 3) {
            return finalCandidates.stream()
                    .max(Comparator.comparingInt(c -> c.rank().getValue()))
                    .orElseThrow();
        } else {
            return finalCandidates.stream()
                    .min(Comparator.comparingInt(c -> c.rank().getValue()))
                    .orElseThrow();
        }
    }

    private Player getNextActivePlayer(Player currentPlayer, List<Player> allPlayers) {
        int currentIndex = -1;
        for (int i = 0; i < allPlayers.size(); i++) {
            if (allPlayers.get(i).getId().equals(currentPlayer.getId())) {
                currentIndex = i;
                break;
            }
        }
        if (currentIndex == -1) {
            return null;
        }
        int size = allPlayers.size();
        for (int i = 1; i < size; i++) {
            int nextIndex = (currentIndex + i) % size;
            Player nextPlayer = allPlayers.get(nextIndex);
            if (!nextPlayer.hasGottenAway()) {
                return nextPlayer;
            }
        }
        return null;
    }
}
