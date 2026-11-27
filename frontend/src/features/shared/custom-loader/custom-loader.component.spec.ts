import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomLoaderComponent, DEFAULT_LOADER_CARDS } from './custom-loader.component';

describe('CustomLoaderComponent', () => {
  let component: CustomLoaderComponent;
  let fixture: ComponentFixture<CustomLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomLoaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the CustomLoaderComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render 10 card-holder elements matching the CodePen by default', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cardHolders = el.querySelectorAll('.card-holder');
    expect(cardHolders.length).toBe(10);
  });

  it('should render .back and .card elements inside each card holder', () => {
    const el: HTMLElement = fixture.nativeElement;
    const backs = el.querySelectorAll('.card-holder .back');
    const cards = el.querySelectorAll('.card-holder .card');

    expect(backs.length).toBe(10);
    expect(cards.length).toBe(10);
  });

  it('should render Clubs cards (A, K, Q, J, 10) and Hearts cards (A, K, Q, J, 10) by default', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.card-holder .card');

    // First 5 cards are Clubs
    expect(cards[0].classList.contains('ace')).toBe(true);
    expect(cards[0].classList.contains('clubs')).toBe(true);

    expect(cards[1].classList.contains('king')).toBe(true);
    expect(cards[1].classList.contains('clubs')).toBe(true);

    expect(cards[2].classList.contains('queen')).toBe(true);
    expect(cards[2].classList.contains('clubs')).toBe(true);

    expect(cards[3].classList.contains('jack')).toBe(true);
    expect(cards[3].classList.contains('clubs')).toBe(true);

    expect(cards[4].classList.contains('ten')).toBe(true);
    expect(cards[4].classList.contains('clubs')).toBe(true);

    // Second 5 cards are Hearts
    expect(cards[5].classList.contains('ace')).toBe(true);
    expect(cards[5].classList.contains('hearts')).toBe(true);

    expect(cards[6].classList.contains('king')).toBe(true);
    expect(cards[6].classList.contains('hearts')).toBe(true);

    expect(cards[7].classList.contains('queen')).toBe(true);
    expect(cards[7].classList.contains('hearts')).toBe(true);

    expect(cards[8].classList.contains('jack')).toBe(true);
    expect(cards[8].classList.contains('hearts')).toBe(true);

    expect(cards[9].classList.contains('ten')).toBe(true);
    expect(cards[9].classList.contains('hearts')).toBe(true);
  });

  it('should set staggered animation-delay styles on card holders', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cardHolders = el.querySelectorAll('.card-holder') as NodeListOf<HTMLElement>;

    expect(cardHolders[0].style.animationDelay).toBe('0.5s');
    expect(cardHolders[1].style.animationDelay).toBe('1s');
    expect(cardHolders[2].style.animationDelay).toBe('1.5s');
    expect(cardHolders[9].style.animationDelay).toBe('5s');
  });

  it('should display the default loading message and update when input changes', () => {
    const el: HTMLElement = fixture.nativeElement;
    const captionEl = el.querySelector('.loader-text');
    expect(captionEl).not.toBeNull();
    expect(captionEl?.textContent?.trim()).toBe('Loading...');

    fixture.componentRef.setInput('text', 'Shuffling Deck...');
    fixture.detectChanges();

    expect(el.querySelector('.loader-text')?.textContent?.trim()).toBe('Shuffling Deck...');
  });

  it('should hide caption when text is empty', () => {
    fixture.componentRef.setInput('text', '');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const caption = el.querySelector('.loader-caption');
    expect(caption).toBeNull();
  });

  it('should apply fullscreen class when fullScreen input is true', () => {
    const el: HTMLElement = fixture.nativeElement;
    const wrapper = el.querySelector('.custom-loader-wrapper');
    expect(wrapper?.classList.contains('fullscreen')).toBe(false);

    fixture.componentRef.setInput('fullScreen', true);
    fixture.detectChanges();

    expect(wrapper?.classList.contains('fullscreen')).toBe(true);
  });

  it('should toggle green felt styling with showFelt input', () => {
    const el: HTMLElement = fixture.nativeElement;
    const stage = el.querySelector('.felt-stage');
    expect(stage?.classList.contains('has-felt')).toBe(true);

    fixture.componentRef.setInput('showFelt', false);
    fixture.detectChanges();

    expect(stage?.classList.contains('has-felt')).toBe(false);
  });

  it('should apply scale transform when scale input is modified', () => {
    fixture.componentRef.setInput('scale', 0.8);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const track = el.querySelector('.cards-track') as HTMLElement;
    expect(track.style.transform).toBe('scale(0.8)');
  });

  it('should support custom cards input', () => {
    fixture.componentRef.setInput('cards', [
      { rank: 'A', suit: 'SPADES' },
      { rank: 'K', suit: 'DIAMONDS' }
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cardHolders = el.querySelectorAll('.card-holder');
    expect(cardHolders.length).toBe(2);

    const cards = el.querySelectorAll('.card-holder .card');
    expect(cards[0].classList.contains('spades')).toBe(true);
    expect(cards[1].classList.contains('diamonds')).toBe(true);
  });
});
