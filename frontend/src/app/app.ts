import { Component, signal } from '@angular/core';
import { GameTableComponent } from '../features/game-table/game-table.component';

@Component({
  selector: 'app-root',
  imports: [GameTableComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
