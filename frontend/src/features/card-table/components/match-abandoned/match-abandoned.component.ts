import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/button/button.component';
import { GameplayIconComponent } from '../../../shared/icon/gameplay-icon.component';
import { HomeIconComponent } from '../../../shared/icon/home-icon.component';

@Component({
  selector: 'app-match-abandoned',
  standalone: true,
  imports: [CommonModule, ButtonComponent, GameplayIconComponent, HomeIconComponent],
  templateUrl: './match-abandoned.component.html',
  styleUrls: ['./match-abandoned.component.css']
})
export class MatchAbandonedComponent {
  private readonly router = inject(Router);

  readonly title = input<string>('Match Abandoned');
  readonly subtitle = input<string>('The match was not completed\nand has been abandoned.');

  readonly playAgain = output<void>();
  readonly backToHome = output<void>();

  onPlayAgain(): void {
    this.playAgain.emit();
    this.router.navigate(['/game']);
  }

  onBackToHome(): void {
    this.backToHome.emit();
    this.router.navigate(['/']);
  }
}
