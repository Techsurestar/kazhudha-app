import { Component, input } from '@angular/core';

export type CardSuit = 'HEARTS' | 'SPADES' | 'DIAMONDS' | 'CLUBS';

@Component({
  selector: 'suit-icon',
  standalone: true,
  template: `
    <svg
      viewBox="0 0 24 24"
       [attr.fill]="color()"
      stroke="none"
      [class]=" 'inline-block shrink-0' + size()"
      aria-hidden="true"
    >
      @switch (suit()) {
        @case ('HEARTS') {
          <path
            d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5
               2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
               C13.09 3.81 14.76 3 16.5 3
               19.58 3 22 5.42 22 8.5
               c0 3.78-3.4 6.86-8.55 11.51L12 21.35Z"
          />
        }

        @case ('SPADES') {
          <path
            d="M12 2C10 5.5 3 9 3 14a5 5 0 0 0 8.5 3.54
               L10 22h4l-1.5-4.46A5 5 0 0 0 21 14
               C21 9 14 5.5 12 2Z"
          />
        }

        @case ('DIAMONDS') {
          <path d="M12 1.5 22 12 12 22.5 2 12 12 1.5Z" />
        }

        @case ('CLUBS') {
          <path
            d="M12 2
            C9.5 2 7.5 4 7.5 6.5
            C7.5 7.8 8.1 9 9.1 9.8
            C8.4 9.4 7.6 9.2 6.8 9.2
            C4.2 9.2 2.2 11.2 2.2 13.8
            C2.2 16.4 4.2 18.4 6.8 18.4
            C8.7 18.4 10.3 17.3 11.2 15.7
            L10 22
            H14
            L12.8 15.7
            C13.7 17.3 15.3 18.4 17.2 18.4
            C19.8 18.4 21.8 16.4 21.8 13.8
            C21.8 11.2 19.8 9.2 17.2 9.2
            C16.4 9.2 15.6 9.4 14.9 9.8
            C15.9 9 16.5 7.8 16.5 6.5
            C16.5 4 14.5 2 12 2
            Z"
  />
        }
      }
    </svg>
  `
})
export class SuitIconComponent {
  suit = input.required<CardSuit>();
  size = input<string>('w-5 h-5');
  color = input<string>('#000');
}