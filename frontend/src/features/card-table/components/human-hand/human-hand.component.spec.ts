import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HumanHandComponent, HandCard } from './human-hand.component';

describe('HumanHandComponent', () => {
  let component: HumanHandComponent;
  let fixture: ComponentFixture<HumanHandComponent>;

  const mockCards: HandCard[] = [
    { rank: '4', suit: 'CLUBS' },
    { rank: 'A', suit: 'HEARTS' },
    { rank: 'K', suit: 'SPADES' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HumanHandComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HumanHandComponent);
    component = fixture.componentInstance;
  });

  it('should create the HumanHandComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render player name and score correctly', () => {
    fixture.componentRef.setInput('name', 'Player One');
    fixture.componentRef.setInput('score', 42);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Player One');
    expect(el.textContent).toContain('42 pts');
  });

  it('should accept player object input', () => {
    fixture.componentRef.setInput('player', {
      name: 'CustomPlayer',
      score: 18,
      cardCount: 5,
      isCurrentTurn: true
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('CustomPlayer');
    expect(el.textContent).toContain('18 pts');
    expect(el.textContent).toContain('5 Cards');

    const nameplate = el.querySelector('.human-nameplate');
    expect(nameplate?.classList.contains('human-turn-active')).toBe(true);
  });

  it('should render a small square avatar icon with /avatar/avatar.jpeg in the nameplate', () => {
    fixture.componentRef.setInput('name', 'You');
    fixture.componentRef.setInput('score', 25);
    fixture.componentRef.setInput('cards', mockCards);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const avatarBox = el.querySelector('.nameplate-avatar-box');
    expect(avatarBox).not.toBeNull();

    const avatar = el.querySelector('.nameplate-avatar-box img') as HTMLImageElement;
    expect(avatar).not.toBeNull();
    expect(avatar.getAttribute('src')).toBe('/avatar/avatar.jpeg');

    const usernameBar = el.querySelector('.nameplate-username-bar');
    expect(usernameBar?.textContent).toContain('You');

    const statBars = el.querySelectorAll('.nameplate-stat-bar');
    expect(statBars[0]?.textContent).toContain('3 Cards');
    expect(statBars[1]?.textContent).toContain('25 pts');
  });

  it('should render cards in the hand using CardComponent', () => {
    fixture.componentRef.setInput('cards', mockCards);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cardButtons = el.querySelectorAll('button');
    expect(cardButtons.length).toBe(3);

    const appCards = el.querySelectorAll('app-card');
    expect(appCards.length).toBe(3);

    expect(el.textContent).toContain('4');
    expect(el.textContent).toContain('A');
    expect(el.textContent).toContain('K');
  });

  it('should emit cardPlay when a card is clicked', () => {
    fixture.componentRef.setInput('cards', mockCards);
    fixture.detectChanges();

    let playedCard: HandCard | undefined;
    component.cardPlay.subscribe((c) => {
      playedCard = c;
    });

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[1].click();

    expect(playedCard).toEqual(mockCards[1]);
  });

  it('should not emit cardPlay when disabled', () => {
    fixture.componentRef.setInput('cards', mockCards);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    let emitted = false;
    component.cardPlay.subscribe(() => {
      emitted = true;
    });

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[0].click();

    expect(emitted).toBe(false);
  });

  it('should show empty state message when cards array is empty', () => {
    fixture.componentRef.setInput('cards', []);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Hand Empty');
  });
});
