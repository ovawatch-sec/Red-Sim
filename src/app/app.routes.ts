import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/game-container/game-container.component').then(m => m.GameContainerComponent)
  },
  { path: '**', redirectTo: '' }
];
