import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-profile.component.html'
})
export class PlayerProfileComponent {
  @Input() player: any;
  @Input() chip: { type: 'gold' | 'silver' | 'bronze'; value: number; label: string } | null = null;
  @Input() isHorizontal = false;
  @Input() isHuman = false;
}
