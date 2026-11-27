import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  afterEach(() => {
    vi.useRealTimers();
    fixture.destroy();
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

  it('should show Skip Game button when cards array is empty and emit skipGame on click', () => {
    fixture.componentRef.setInput('cards', []);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Skip Game');

    let skipped = false;
    component.skipGame.subscribe(() => {
      skipped = true;
    });

    const skipButton = el.querySelector('button.skip-game-btn') as HTMLButtonElement;
    expect(skipButton).not.toBeNull();
    skipButton.click();

    expect(skipped).toBe(true);
  });

  it('should not show Skip Game button when canSkip is false even if cards array is empty', () => {
    fixture.componentRef.setInput('cards', []);
    fixture.componentRef.setInput('canSkip', false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Skip Game');
    const skipButton = el.querySelector('button.skip-game-btn');
    expect(skipButton).toBeNull();
  });

  describe('Turn countdown timer (20 seconds)', () => {
    it('should start countdown from 20 seconds when active turn and disabled is false', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBe(20);
      const timerBadge = fixture.nativeElement.querySelector('.turn-timer-badge');
      expect(timerBadge).not.toBeNull();
      expect(timerBadge?.textContent).toContain('20s');
      expect(timerBadge?.classList.contains('timer-normal')).toBe(true);
    });

    it('should display orange color when time is between 10 and 5 seconds', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      // 10s elapsed -> 10s remaining (threshold)
      vi.advanceTimersByTime(10000);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBe(10);
      expect(component.timerColorClass()).toBe('timer-orange');
      const timerBadge = fixture.nativeElement.querySelector('.turn-timer-badge');
      expect(timerBadge?.classList.contains('timer-orange')).toBe(true);

      // Advance to 5s remaining
      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(component.remainingSeconds()).toBe(5);
      expect(component.timerColorClass()).toBe('timer-orange');
      expect(timerBadge?.classList.contains('timer-orange')).toBe(true);
    });

    it('should display red color when time goes below 5 seconds', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      // Advance 16s -> 4s remaining (< 5)
      vi.advanceTimersByTime(16000);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBe(4);
      expect(component.timerColorClass()).toBe('timer-red');
      const timerBadge = fixture.nativeElement.querySelector('.turn-timer-badge');
      expect(timerBadge?.classList.contains('timer-red')).toBe(true);
    });

    it('should emit timeUp when countdown reaches 0 seconds', () => {
      vi.useFakeTimers();
      let timeUpEmitted = false;
      component.timeUp.subscribe(() => {
        timeUpEmitted = true;
      });

      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      // Advance full 20 seconds
      vi.advanceTimersByTime(20000);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBe(0);
      expect(timeUpEmitted).toBe(true);
    });

    it('should stop timer when a card is clicked', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('cards', mockCards);
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBe(20);
      const cardButtons = fixture.nativeElement.querySelectorAll('button');
      cardButtons[0].click();

      expect(component.remainingSeconds()).toBeNull();
    });

    it('should stop timer when skip game is clicked', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('cards', []);
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBe(20);
      const skipButton = fixture.nativeElement.querySelector('button.skip-game-btn') as HTMLButtonElement;
      skipButton.click();

      expect(component.remainingSeconds()).toBeNull();
    });

    it('should not start timer when disabled is true', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBeNull();
      const timerBadge = fixture.nativeElement.querySelector('.turn-timer-badge');
      expect(timerBadge).toBeNull();
    });
  });

  describe('Dev timer switch (dev purpose)', () => {
    it('should render dev timer switch when in dev mode', () => {
      fixture.componentRef.setInput('isDev', true);
      fixture.detectChanges();

      const switchEl = fixture.nativeElement.querySelector('[data-testid="dev-timer-switch"]');
      expect(switchEl).not.toBeNull();
      expect(switchEl.getAttribute('role')).toBe('switch');
      expect(switchEl.getAttribute('aria-checked')).toBe('true');
      expect(switchEl.textContent).toContain('DEV');
      expect(switchEl.textContent).toContain('ON');
    });

    it('should NOT render dev timer switch when isDev is false (production mode)', () => {
      fixture.componentRef.setInput('isDev', false);
      fixture.detectChanges();

      const switchEl = fixture.nativeElement.querySelector('[data-testid="dev-timer-switch"]');
      expect(switchEl).toBeNull();
    });

    it('should toggle timer off and stop active countdown when clicked', () => {
      vi.useFakeTimers();
      let timeUpEmitted = false;
      component.timeUp.subscribe(() => {
        timeUpEmitted = true;
      });

      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBe(20);
      expect(component.isTimerOff()).toBe(false);

      const switchEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="dev-timer-switch"]');
      expect(switchEl).not.toBeNull();
      switchEl.click();
      fixture.detectChanges();

      expect(component.devTimerOff()).toBe(true);
      expect(component.isTimerOff()).toBe(true);
      expect(switchEl.getAttribute('aria-checked')).toBe('false');
      expect(switchEl.textContent).toContain('OFF');
      expect(component.remainingSeconds()).toBeNull();

      // Advancing time should not trigger timeUp because timer is off
      vi.advanceTimersByTime(25000);
      fixture.detectChanges();
      expect(timeUpEmitted).toBe(false);
    });

    it('should restart timer when switch is toggled back ON during active turn', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      const switchEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="dev-timer-switch"]');

      // Turn OFF
      switchEl.click();
      fixture.detectChanges();
      expect(component.isTimerOff()).toBe(true);
      expect(component.remainingSeconds()).toBeNull();

      // Turn back ON
      switchEl.click();
      fixture.detectChanges();
      expect(component.isTimerOff()).toBe(false);
      expect(component.remainingSeconds()).toBe(20);

      // Countdown advances normally
      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(component.remainingSeconds()).toBe(15);
    });

    it('should toggle timer off using keyboard Enter or Space', () => {
      fixture.componentRef.setInput('isDev', true);
      fixture.detectChanges();

      const switchEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="dev-timer-switch"]');
      expect(component.isTimerOff()).toBe(false);

      // Trigger Enter key
      switchEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      expect(component.isTimerOff()).toBe(true);

      // Trigger Space key
      switchEl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      fixture.detectChanges();
      expect(component.isTimerOff()).toBe(false);
    });

    it('should prevent timer from starting when devTimerOff input is initially true', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('devTimerOff', true);
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      expect(component.isTimerOff()).toBe(true);
      expect(component.remainingSeconds()).toBeNull();
      const timerBadge = fixture.nativeElement.querySelector('.turn-timer-badge');
      expect(timerBadge).toBeNull();
    });

    it('should support timerOff input alias to set timer off', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('timerOff', true);
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      expect(component.isTimerOff()).toBe(true);
      expect(component.remainingSeconds()).toBeNull();
    });

    it('should support setTimerOff method', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      expect(component.remainingSeconds()).toBe(20);

      component.setTimerOff(true);
      fixture.detectChanges();

      expect(component.isTimerOff()).toBe(true);
      expect(component.remainingSeconds()).toBeNull();

      component.setTimerOff(false);
      fixture.detectChanges();

      expect(component.isTimerOff()).toBe(false);
      expect(component.remainingSeconds()).toBe(20);
    });

    it('should ignore dev timer switch in production mode even if devTimerOff is set', () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('isDev', false);
      fixture.componentRef.setInput('devTimerOff', true);
      fixture.componentRef.setInput('isCurrentTurn', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      // In production mode, isTimerOff remains false and timer runs normally
      expect(component.isTimerOff()).toBe(false);
      expect(component.remainingSeconds()).toBe(20);
    });
  });
});
