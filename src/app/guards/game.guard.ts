import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GameService } from '../services/game.service';

export const gameGuard: CanActivateFn = () => {
  const gameService = inject(GameService);
  const router = inject(Router);

  return gameService.ensureInitialized().pipe(
    map((ok) => {
      if (!ok) {
        console.error('Game initialization failed');
      }
      return ok;
    }),
    catchError((err) => {
      console.error('Guard initialization error', err);
      router.navigateByUrl('/');
      return of(false);
    })
  );
};
