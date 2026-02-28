import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  GameData,
  GameDataEnvelope,
  GameLoadResult,
  MissionPackData,
} from '../models/game.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private readonly http: HttpClient) {}
  //private url = `${environment.apiUrl}/scenario`;
   private url = `${environment.apiUrl}/scenario`;
  loadGameData(): Observable<GameLoadResult> {
    return this.http.get<GameDataEnvelope>(this.url).pipe(
      map((res) => this.normalizeEnvelope(res)),
      catchError((err) => {
        console.error('Failed to load game data', err);
        return throwError(() => new Error('Unable to load game-data.json'));
      }),
    );
  }

  private normalizeEnvelope(res: GameDataEnvelope): GameLoadResult {
    const payload = res?.gameData as any;

    if (payload && Array.isArray((payload as MissionPackData).games)) {
      const pack = payload as MissionPackData;
      const games = (pack.games ?? []).filter(
        (g) => !!g?.startQuestionId && Array.isArray(g?.questions),
      );
      if (!games.length) {
        throw new Error('Mission pack contains no playable games');
      }
      return {
        activeGame: games[0],
        games,
        isMissionPack: true,
        packTitle: pack.title,
        packDescription: pack.description,
      };
    }

    const single = payload as GameData;
    if (!single?.startQuestionId || !Array.isArray(single?.questions)) {
      throw new Error('Invalid game-data.json format');
    }

    return {
      activeGame: single,
      games: [single],
      isMissionPack: false,
      packTitle: single.title,
      packDescription: single.description,
    };
  }
}
