import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

const SUIT_ORDER: Record<'SPADES' | 'HEARTS' | 'CLUBS' | 'DIAMONDS', number> = {
  'SPADES': 0,
  'HEARTS': 1,
  'CLUBS': 2,
  'DIAMONDS': 3
};

const RANK_ORDER: Record<string, number> = {
  'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10,
  'JACK': 11, 'QUEEN': 12, 'KING': 13, 'ACE': 14
};

export interface Card {
  suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
  rank: string;
  display: string;
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface PlayerInfo {
  id: string;
  name: string;
  avatar: string;
  cardCount: number;
  isBot: boolean;
  isCurrentTurn: boolean;
  hasGottenAway: boolean;
}

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-table.component.html'
})
export class GameTableComponent {
  protected readonly Math = Math;

  sortedHumanHand = computed(() => {
    return [...this.humanHand()].sort((a, b) => {
      const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
      if (suitDiff !== 0) {
        return suitDiff;
      }
      return (RANK_ORDER[a.rank] || 0) - (RANK_ORDER[b.rank] || 0);
    });
  });

  // Stubbed mock data using Angular Signals
  players = signal<PlayerInfo[]>([
    { id: 'bot2', name: 'Opponent 2 (Bot)', avatar: 'B2', cardCount: 8, isBot: true, isCurrentTurn: false, hasGottenAway: false },
    { id: 'bot1', name: 'Opponent 1 (Bot)', avatar: 'B1', cardCount: 11, isBot: true, isCurrentTurn: true, hasGottenAway: false },
    { id: 'bot3', name: 'Opponent 3 (Bot)', avatar: 'B3', cardCount: 6, isBot: true, isCurrentTurn: false, hasGottenAway: false },
    { id: 'human', name: 'Player 1 (You)', avatar: 'P1', cardCount: 9, isBot: false, isCurrentTurn: false, hasGottenAway: false }
  ]);

  tablePile = signal<PlayedCard[]>([
    { playerId: 'bot1', card: { suit: 'SPADES', rank: 'ACE', display: '♠A' } },
    { playerId: 'bot2', card: { suit: 'SPADES', rank: 'TEN', display: '♠10' } },
    { playerId: 'bot3', card: { suit: 'SPADES', rank: 'KING', display: '♠K' } }
  ]);

  activeRoundSuit = signal<string>('SPADES');

  humanHand = signal<Card[]>([
    { suit: 'SPADES', rank: 'FOUR', display: '♠4' },
    { suit: 'HEARTS', rank: 'ACE', display: '♥A' },
    { suit: 'CLUBS', rank: 'NINE', display: '♣9' },
    { suit: 'DIAMONDS', rank: 'KING', display: '♦K' },
    { suit: 'SPADES', rank: 'QUEEN', display: '♠Q' },
    { suit: 'HEARTS', rank: 'JACK', display: '♥J' },
    { suit: 'DIAMONDS', rank: 'SEVEN', display: '♦7' },
    { suit: 'CLUBS', rank: 'TWO', display: '♣2' },
    { suit: 'SPADES', rank: 'NINE', display: '♠9' }
  ]);

  // Helpers to get player status
  getPlayerById(id: string): PlayerInfo | undefined {
    return this.players().find(p => p.id === id);
  }

  getPlayedCardByPlayer(playerId: string): PlayedCard | undefined {
    return this.tablePile().find(pc => pc.playerId === playerId);
  }
}
