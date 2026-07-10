import { Routes } from '@angular/router';
import { HomeComponent } from '../features/home/home.component';
import { GameTableComponent } from '../features/game-table/game-table.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'game', component: GameTableComponent }
];
