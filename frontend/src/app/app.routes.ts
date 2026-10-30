import { Routes } from '@angular/router';
import { HomeComponent } from '../features/home/home.component';
import { GameTableComponent } from '../features/game-table/game-table.component';
import { HowToPlayComponent } from '../features/how-to-play/how-to-play.component';
import { CardTableComponent } from '../features/card-table/card-table.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'game', component: GameTableComponent },
  { path: 'card-table', component: CardTableComponent },
  { path: 'table', redirectTo: 'card-table', pathMatch: 'full' },
  { path: 'how-to-play', component: HowToPlayComponent }
];
