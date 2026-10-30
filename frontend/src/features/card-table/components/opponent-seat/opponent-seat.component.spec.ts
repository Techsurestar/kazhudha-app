import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpponentSeatComponent } from './opponent-seat.component';

describe('OpponentSeatComponent', () => {
  let component: OpponentSeatComponent;
  let fixture: ComponentFixture<OpponentSeatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpponentSeatComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(OpponentSeatComponent);
    component = fixture.componentInstance;
  });

  it('should create the OpponentSeatComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render top position with cards above nameplate', () => {
    fixture.componentRef.setInput('position', 'top');
    fixture.componentRef.setInput('name', 'Leo');
    fixture.componentRef.setInput('score', 5);
    fixture.componentRef.setInput('cardCount', 6);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Leo');
    expect(el.textContent).toContain('5 pts');

    const cards = el.querySelectorAll('.bot-card-back');
    expect(cards.length).toBe(6);
  });

  it('should render left position with vertical cards', () => {
    fixture.componentRef.setInput('position', 'left');
    fixture.componentRef.setInput('name', 'Jenny');
    fixture.componentRef.setInput('score', 10);
    fixture.componentRef.setInput('cardCount', 4);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Jenny');
    expect(el.textContent).toContain('10 pts');

    const cards = el.querySelectorAll('.bot-card-back');
    expect(cards.length).toBe(4);
  });

  it('should render right position correctly', () => {
    fixture.componentRef.setInput('position', 'right');
    fixture.componentRef.setInput('name', 'Sofia');
    fixture.componentRef.setInput('score', 0);
    fixture.componentRef.setInput('cardCount', 8);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sofia');
    expect(el.textContent).toContain('0 pts');

    const cards = el.querySelectorAll('.bot-card-back');
    expect(cards.length).toBe(8);
  });

  it('should accept player object input', () => {
    fixture.componentRef.setInput('player', {
      name: 'TestBot',
      score: 15,
      cardCount: 3,
      position: 'top',
      isCurrentTurn: true
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('TestBot');
    expect(el.textContent).toContain('15 pts');

    const nameplate = el.querySelector('.bot-nameplate');
    expect(nameplate?.classList.contains('turn-active')).toBe(true);
  });

  it('should render rank chip when provided', () => {
    fixture.componentRef.setInput('position', 'top');
    fixture.componentRef.setInput('name', 'WinnerBot');
    fixture.componentRef.setInput('chip', { label: '1st', type: 'gold' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('1st');
    expect(el.querySelectorAll('.bot-card-back').length).toBe(0);
  });

  it('should render a small square avatar icon with /avatar/avatar.jpeg in the nameplate', () => {
    fixture.componentRef.setInput('position', 'top');
    fixture.componentRef.setInput('name', 'Leo');
    fixture.componentRef.setInput('cardCount', 13);
    fixture.componentRef.setInput('score', 45);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const avatarBox = el.querySelector('.nameplate-avatar-box');
    expect(avatarBox).not.toBeNull();

    const avatar = el.querySelector('.nameplate-avatar-box img') as HTMLImageElement;
    expect(avatar).not.toBeNull();
    expect(avatar.getAttribute('src')).toBe('/avatar/avatar.jpeg');

    // Username bar
    const usernameBar = el.querySelector('.nameplate-username-bar');
    expect(usernameBar?.textContent).toContain('Leo');

    // Cards row (row 1 below username) and Points row (row 2 below username)
    const statBars = el.querySelectorAll('.nameplate-stat-bar');
    expect(statBars[0]?.textContent).toContain('13 Cards');
    expect(statBars[1]?.textContent).toContain('45 pts');

    // Icon boxes and svgs should not be present
    expect(el.querySelector('.cyan-icon-box')).toBeNull();
    expect(el.querySelector('.red-icon-box')).toBeNull();
  });

  it('should maintain a fixed-height card container for left opponent so nameplate stays put', () => {
    fixture.componentRef.setInput('position', 'left');
    fixture.componentRef.setInput('name', 'Jenny');
    fixture.componentRef.setInput('cardCount', 12);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cardsContainer = el.querySelector('.h-\\[184px\\]');
    expect(cardsContainer).not.toBeNull();
  });

  it('should maintain a fixed-height card container for right opponent so nameplate stays put', () => {
    fixture.componentRef.setInput('position', 'right');
    fixture.componentRef.setInput('name', 'Sofia');
    fixture.componentRef.setInput('cardCount', 12);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cardsContainer = el.querySelector('.h-\\[184px\\]');
    expect(cardsContainer).not.toBeNull();
  });
});
