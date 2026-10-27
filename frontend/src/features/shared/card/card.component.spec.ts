import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
  });

  it('should create the CardComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should display rank and suit correctly for Hearts', () => {
    component.rank = 'Q';
    component.suit = 'HEARTS';
    fixture.detectChanges();

    expect(component.effectiveRank).toBe('Q');
    expect(component.effectiveSuit).toBe('HEARTS');
    expect(component.isRed).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Q');
    const suitIcons = el.querySelectorAll('suit-icon');
    expect(suitIcons.length).toBe(2); // Top corner + center
  });

  it('should display rank and suit correctly for Spades', () => {
    component.rank = 'A';
    component.suit = 'SPADES';
    fixture.detectChanges();

    expect(component.effectiveRank).toBe('A');
    expect(component.effectiveSuit).toBe('SPADES');
    expect(component.isRed).toBe(false);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('A');
    const suitIcons = el.querySelectorAll('suit-icon');
    expect(suitIcons.length).toBe(2);
  });

  it('should normalize word ranks like ACE and KING', () => {
    component.card = { rank: 'ACE', suit: 'HEARTS' };
    fixture.detectChanges();

    expect(component.effectiveRank).toBe('A');
  });

  it('should apply centerClass and cardClass', () => {
    component.rank = 'K';
    component.suit = 'HEARTS';
    component.cardClass = 'custom-test-card';
    component.centerClass = 'translate-x-2 translate-y-2';
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cardEl = el.querySelector('.playing-card');
    expect(cardEl?.classList.contains('custom-test-card')).toBe(true);

    const centerContainer = el.querySelector('.absolute.inset-0');
    expect(centerContainer?.classList.contains('translate-x-2')).toBe(true);
    expect(centerContainer?.classList.contains('translate-y-2')).toBe(true);
  });
});
