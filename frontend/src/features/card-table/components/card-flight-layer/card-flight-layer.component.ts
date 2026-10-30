import { Component, signal, output } from '@angular/core';
import { CardComponent } from '../../../shared/card/card.component';

export type FlightOrigin = 'top' | 'left' | 'right' | 'bottom';
export type FlightTarget = 'top' | 'left' | 'right' | 'bottom';
export type FlightMode = 'play' | 'deal';

export interface FlightItem {
  id: string;
  rank?: string;
  suit?: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS' | string;
  from: FlightOrigin;
  to?: FlightTarget;
  mode?: FlightMode;
  isFaceDown?: boolean;
  durationMs?: number;
}

@Component({
  selector: 'app-card-flight-layer',
  imports: [CardComponent],
  templateUrl: './card-flight-layer.component.html',
  styleUrls: ['./card-flight-layer.component.css']
})
export class CardFlightLayerComponent {
  /** Queue of cards currently traveling across the table */
  readonly activeFlights = signal<FlightItem[]>([]);

  /** Emitted when a card completes its flight into the center table or player hand */
  readonly flightComplete = output<{ flightId: string; item: FlightItem }>();

  /**
   * Spawns and animates a card moving along its flight trajectory.
   * Returns a promise that resolves upon flight completion.
   */
  triggerFlight(flight: FlightItem): Promise<void> {
    const duration = flight.durationMs ?? (flight.mode === 'deal' ? 220 : 600);

    this.activeFlights.update(list => [...list, flight]);

    return new Promise((resolve) => {
      setTimeout(() => {
        this.activeFlights.update(list => list.filter(f => f.id !== flight.id));
        this.flightComplete.emit({ flightId: flight.id, item: flight });
        resolve();
      }, duration);
    });
  }

  getFlightClass(flight: FlightItem): string {
    if (flight.mode === 'deal') {
      return `deal-to-${flight.to || 'bottom'}`;
    }
    return `fly-from-${flight.from}`;
  }
}
