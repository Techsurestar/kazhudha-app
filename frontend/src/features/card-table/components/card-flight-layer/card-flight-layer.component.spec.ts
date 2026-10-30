import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardFlightLayerComponent, FlightItem } from './card-flight-layer.component';

describe('CardFlightLayerComponent', () => {
  let component: CardFlightLayerComponent;
  let fixture: ComponentFixture<CardFlightLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardFlightLayerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CardFlightLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the CardFlightLayerComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate correct flight animation class for play mode', () => {
    expect(component.getFlightClass({ id: '1', from: 'top' })).toBe('fly-from-top');
    expect(component.getFlightClass({ id: '2', from: 'left' })).toBe('fly-from-left');
    expect(component.getFlightClass({ id: '3', from: 'right' })).toBe('fly-from-right');
    expect(component.getFlightClass({ id: '4', from: 'bottom' })).toBe('fly-from-bottom');
  });

  it('should calculate correct flight animation class for deal mode', () => {
    expect(component.getFlightClass({ id: '1', from: 'bottom', to: 'top', mode: 'deal' })).toBe('deal-to-top');
    expect(component.getFlightClass({ id: '2', from: 'bottom', to: 'left', mode: 'deal' })).toBe('deal-to-left');
    expect(component.getFlightClass({ id: '3', from: 'bottom', to: 'right', mode: 'deal' })).toBe('deal-to-right');
    expect(component.getFlightClass({ id: '4', from: 'bottom', to: 'bottom', mode: 'deal' })).toBe('deal-to-bottom');
  });

  it('should render a flying card during active flight and emit completion', async () => {
    vi.useFakeTimers();

    const flight: FlightItem = {
      id: 'test-1',
      rank: 'A',
      suit: 'SPADES',
      from: 'bottom',
      durationMs: 300
    };

    let completedPayload: { flightId: string; item: FlightItem } | undefined;
    component.flightComplete.subscribe(res => {
      completedPayload = res;
    });

    const flightPromise = component.triggerFlight(flight);
    fixture.detectChanges();

    // Check that card is in activeFlights and DOM
    expect(component.activeFlights().length).toBe(1);
    const flyingEl = fixture.nativeElement.querySelector('.fly-from-bottom');
    expect(flyingEl).not.toBeNull();

    // Fast-forward animation timer
    vi.advanceTimersByTime(300);
    await flightPromise;
    fixture.detectChanges();

    // Check completion
    expect(component.activeFlights().length).toBe(0);
    expect(completedPayload?.flightId).toBe('test-1');
    expect(completedPayload?.item.rank).toBe('A');

    vi.useRealTimers();
  });

  it('should render a face-down card back when dealing', async () => {
    vi.useFakeTimers();

    const flight: FlightItem = {
      id: 'deal-1',
      from: 'bottom',
      to: 'left',
      mode: 'deal',
      isFaceDown: true,
      durationMs: 200
    };

    component.triggerFlight(flight);
    fixture.detectChanges();

    const el = fixture.nativeElement;
    const cardBack = el.querySelector('.deal-to-left .bot-card-back');
    expect(cardBack).not.toBeNull();

    vi.advanceTimersByTime(200);
    vi.useRealTimers();
  });
});
