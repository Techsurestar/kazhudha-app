import { Component, HostListener, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardComponent } from '../shared/card/card.component';
import { ChevronsRightComponent } from "../shared/icon/chevrons-right.component";
import { ChevronsLeftComponent } from '../shared/icon/chevrons-left.component';
import { HomeIconComponent } from '../shared/icon/home-icon.component';

export interface CardRankInfo {
  rank: string;
  name: string;
  powerLabel: string;
  suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
  isRange?: boolean;
}

export interface PlayingCard {
  rank: string;
  suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
}

@Component({
  selector: 'app-how-to-play',
  standalone: true,
  imports: [CommonModule, ChevronsRightComponent, ChevronsLeftComponent, HomeIconComponent, CardComponent],
  templateUrl: './how-to-play.component.html',
  styleUrls: ['./how-to-play.component.css']
})
export class HowToPlayComponent {
  @Input() isModal = false;
  @Output() closed = new EventEmitter<void>();

  readonly currentStep = signal<number>(1);
  readonly totalSteps = 5;
  readonly showRulesModal = signal<boolean>(false);

  readonly cardRanks: CardRankInfo[] = [
    { rank: 'A', name: 'Ace', powerLabel: 'Highest (14)', suit: 'SPADES' },
    { rank: 'K', name: 'King', powerLabel: '(13)', suit: 'SPADES' },
    { rank: 'Q', name: 'Queen', powerLabel: '(12)', suit: 'SPADES' },
    { rank: 'J', name: 'Jack', powerLabel: '(11)', suit: 'SPADES' },
    { rank: '10', name: 'Ten', powerLabel: '(10)', suit: 'SPADES' },
    { rank: '9', name: 'Nine', powerLabel: '(9)', suit: 'SPADES' },
    { rank: '8-4', name: '8 to 4 (Eight … Four)', powerLabel: '(8 – 4)', suit: 'SPADES', isRange: true },
    { rank: '3', name: 'Three', powerLabel: '(3)', suit: 'SPADES' },
    { rank: '2', name: 'Two', powerLabel: 'Lowest (2)', suit: 'SPADES' },
  ];

  constructor(private router: Router) {}

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.showRulesModal()) {
      if (event.key === 'Escape') {
        this.closeRulesModal();
      }
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'Space') {
      if (this.currentStep() < this.totalSteps) {
        this.nextStep();
      }
    } else if (event.key === 'ArrowLeft') {
      if (this.currentStep() > 1) {
        this.prevStep();
      }
    } else if (event.key === 'Escape') {
      this.skip();
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
      this.scrollToTop();
    } else {
      this.playNow();
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
      this.scrollToTop();
    } else if (this.isModal) {
      this.close();
    } else {
      this.router.navigate(['/']);
    }
  }

  goHome(): void {
    if (this.isModal) {
      this.close();
    } else {
      this.router.navigate(['/']);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
      this.scrollToTop();
    }
  }

  skip(): void {
    if (this.isModal) {
      this.close();
    } else {
      this.router.navigate(['/game']);
    }
  }

  playNow(): void {
    if (this.isModal) {
      this.close();
    }
    this.router.navigate(['/game']);
  }

  close(): void {
    this.closed.emit();
  }

  openRulesModal(): void {
    this.showRulesModal.set(true);
  }

  closeRulesModal(): void {
    this.showRulesModal.set(false);
  }

  private scrollToTop(): void {
    const container = document.getElementById('tutorial-scroll-container');
    if (container) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        container.scrollTop = 0;
      }
    }
  }
}
