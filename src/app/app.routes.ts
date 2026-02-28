import { Routes } from '@angular/router';
import { gameGuard } from './guards/game.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [gameGuard],
    loadComponent: () =>
      import('./components/game-container/game-container.component').then(m => m.GameContainerComponent)
  },
  { path: '**', redirectTo: '' }
];
