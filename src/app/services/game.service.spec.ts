import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataService } from './data.service';
import { GameService } from './game.service';
import { GameData, GameLoadResult } from '../models/game.models';

const mockGame: GameData = {
  id: 'm1',
  title: 'Test Sim',
  description: 'desc',
  startQuestionId: 'Q1',
  questions: [
    { id: 'Q1', text: 'Start', choices: [{ option: 'Go', nextQuestionId: 'Q2' }] },
    { id: 'Q2', text: 'Outcome: Success! Win!', choices: [], result: 'win', flag: 'FLAG{test}' }
  ]
};

const mockLoadResult: GameLoadResult = {
  activeGame: mockGame,
  games: [mockGame],
  isMissionPack: false,
  packTitle: mockGame.title,
  packDescription: mockGame.description
};

describe('GameService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GameService,
        {
          provide: DataService,
          useValue: {
            loadGameData: () => of(mockLoadResult)
          }
        }
      ]
    });
    localStorage.clear();
  });

  it('loads data and initializes current question', (done) => {
    const svc = TestBed.inject(GameService);
    svc.loadGameData().subscribe(() => {
      expect(svc.getCurrentQuestionSnapshot()?.id).toBe('Q1');
      done();
    });
  });

  it('moves to next question and marks win', (done) => {
    const svc = TestBed.inject(GameService);
    svc.loadGameData().subscribe(() => {
      const q1 = svc.getCurrentQuestionSnapshot()!;
      svc.selectChoice(q1.choices[0]);
      expect(svc.getCurrentQuestionSnapshot()?.id).toBe('Q2');
      expect(svc.getStateSnapshot().gameStatus).toBe('won');
      done();
    });
  });

  it('exports markdown path report', (done) => {
    const svc = TestBed.inject(GameService);
    svc.loadGameData().subscribe(() => {
      const md = svc.exportPathMarkdown();
      expect(md).toContain('Attack Path Report');
      done();
    });
  });

  it('switches to a new mission when mission pack has multiple games', (done) => {
    const multi: GameLoadResult = {
      ...mockLoadResult,
      activeGame: mockGame,
      games: [
        mockGame,
        { ...mockGame, id: 'm2', title: 'Test Sim 2' }
      ],
      isMissionPack: true,
      packTitle: 'Pack'
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        GameService,
        { provide: DataService, useValue: { loadGameData: () => of(multi) } }
      ]
    });

    const svc = TestBed.inject(GameService);
    svc.loadGameData().subscribe(() => {
      const before = svc.getCurrentMissionId();
      svc.startNewMission();
      const after = svc.getCurrentMissionId();
      expect(after).toBeTruthy();
      expect(after).not.toBe(before);
      done();
    });
  });
});
