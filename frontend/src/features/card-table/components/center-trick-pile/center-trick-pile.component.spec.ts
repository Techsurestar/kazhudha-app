import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CenterTrickPileComponent, TrickCard } from './center-trick-pile.component';

describe('CenterTrickPileComponent', () => {
  let component: CenterTrickPileComponent;
  let fixture: ComponentFixture<CenterTrickPileComponent>;

  const mockCards: TrickCard[] = [
    { playerId: 'bot1', rank: '2', suit: 'CLUBS', position: 'left' },
    { playerId: 'bot2', rank: '3', suit: 'CLUBS', position: 'top' },
    { playerId: 'bot3', rank: 'J', suit: 'CLUBS', position: 'right' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CenterTrickPileComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CenterTrickPileComponent);
    component = fixture.componentInstance;
  });

  it('should create the CenterTrickPileComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render played cards in the trick pile', () => {
    fixture.componentRef.setInput('cards', mockCards);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('app-card');
    expect(cards.length).toBe(3);

    expect(el.textContent).toContain('2');
    expect(el.textContent).toContain('3');
    expect(el.textContent).toContain('J');
  });

  it('should calculate correct cardinal position classes', () => {
    expect(component.getPositionClass('top')).toContain('-translate-y-[50px]');
    expect(component.getPositionClass('left')).toContain('-translate-x-[56px]');
    expect(component.getPositionClass('right')).toContain('translate-x-[56px]');
    expect(component.getPositionClass('bottom')).toContain('translate-y-[50px]');
    expect(component.getPositionClass(undefined)).toBe('z-10');
  });

  it('should render vettu flashing aura when isVettuFlashing is true', () => {
    fixture.componentRef.setInput('isVettuFlashing', true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const vettuAura = el.querySelector('.animate-vettu-ring');
    expect(vettuAura).not.toBeNull();
  });

  it('should render zero cards when cards input is empty', () => {
    fixture.componentRef.setInput('cards', []);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('app-card').length).toBe(0);
  });

  it('should render stacked 52-card deck when deckCount is greater than zero', () => {
    fixture.componentRef.setInput('deckCount', 52);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const deckBacks = el.querySelectorAll('.bot-card-back');
    expect(deckBacks.length).toBeGreaterThan(0);
  });
});
