import type { Card } from './card.js';
import { findCardIndex } from './card.js';

export class Player {
  public readonly id: string;
  public readonly name: string;
  private _hand: Card[];
  public readonly isBot: boolean;
  private _hasGottenAway: boolean;

  constructor(id: string, name: string, isBot: boolean) {
    if (!id) throw new Error('Player ID cannot be null or empty');
    if (!name) throw new Error('Player name cannot be null or empty');
    this.id = id;
    this.name = name;
    this._hand = [];
    this.isBot = isBot;
    this._hasGottenAway = false;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getHand(): readonly Card[] {
    return this._hand;
  }

  public get hand(): readonly Card[] {
    return this._hand;
  }

  public hasGottenAway(): boolean {
    return this._hasGottenAway;
  }

  public setHasGottenAway(hasGottenAway: boolean): void {
    this._hasGottenAway = hasGottenAway;
  }

  public addCard(card: Card): void {
    if (!card) throw new Error('Cannot add a null card to player hand');
    this._hand.push(card);
  }

  public addCards(cards: readonly Card[]): void {
    if (!cards) throw new Error('Cannot add a null list of cards');
    for (const card of cards) {
      this.addCard(card);
    }
  }

  public removeCard(card: Card): boolean {
    if (!card) throw new Error('Cannot remove a null card');
    const index = findCardIndex(this._hand, card);
    if (index !== -1) {
      this._hand.splice(index, 1);
      return true;
    }
    return false;
  }

  public clearHand(): void {
    this._hand = [];
  }
}
