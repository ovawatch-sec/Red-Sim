import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, tap, throwError } from 'rxjs';
import { Choice, GameData, GameLoadResult, GameState, GameStatistics, Question } from '../models/game.models';
import { DataService } from './data.service';

const STORAGE_KEY = 'acheron-red-team-sim-state-v2';

type MissionInfo = {
  count: number;
  index: number;
  isMissionPack: boolean;
  packTitle?: string;
};

function initialState(startQuestionId = 'Q1'): GameState {
  return {
    currentQuestionId: startQuestionId,
    history: [startQuestionId],
    branchDepth: 1,
    completedBranches: [],
    gameStatus: 'playing',
    startTime: new Date(),
    pathTaken: [],
    attempts: 1,
    hintsRemaining: 3,
    hintsUsed: 0,
    usedChoiceKeys: []
  };
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly gameDataSubject = new BehaviorSubject<GameData | null>(null);
  private readonly stateSubject = new BehaviorSubject<GameState>(initialState());
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly missionInfoSubject = new BehaviorSubject<MissionInfo>({ count: 1, index: 0, isMissionPack: false });

  readonly gameData$ = this.gameDataSubject.asObservable();
  readonly state$ = this.stateSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly missionInfo$ = this.missionInfoSubject.asObservable();

  private lookup = new Map<string, Question>();
  private initialized = false;
  private allGames: GameData[] = [];
  private packTitle?: string;
  private packDescription?: string;
  private isMissionPack = false;

  constructor(private readonly dataService: DataService) {}

  ensureInitialized(): Observable<boolean> {
    if (this.initialized && this.gameDataSubject.value) {
      return of(true);
    }
    return this.loadGameData().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  loadGameData(): Observable<GameData> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.dataService.loadGameData().pipe(
      tap((payload) => {
        this.bootstrapMissionPack(payload);
        this.initialized = true;
        this.loadGame(); // Load saved progress after data exists
        this.loadingSubject.next(false);
      }),
      map(() => this.gameDataSubject.value as GameData),
      catchError((err) => {
        this.loadingSubject.next(false);
        this.errorSubject.next(err?.message ?? 'Unknown error loading data');
        return throwError(() => err);
      })
    );
  }

  getCurrentQuestion(): Observable<Question | null> {
    return combineLatest([this.gameData$, this.state$]).pipe(
      map(([data, state]) => {
        if (!data) return null;
        return this.lookup.get(state.currentQuestionId) ?? null;
      })
    );
  }

  getQuestionById(id: string): Question | undefined {
    return this.lookup.get(id);
  }

  getQuestionsIndex(): Map<string, Question> {
    return this.lookup;
  }

  getCurrentQuestionSnapshot(): Question | null {
    const state = this.stateSubject.value;
    return this.lookup.get(state.currentQuestionId) ?? null;
  }

  getStateSnapshot(): GameState {
    return this.stateSubject.value;
  }

  getCurrentMission(): GameData | null {
    return this.gameDataSubject.value;
  }

  getCurrentMissionId(): string | null {
    const game = this.gameDataSubject.value;
    return game ? this.getGameKey(game) : null;
  }

  getMissionCount(): number {
    return this.allGames.length || 1;
  }

  startNewMission(): GameData | null {
    if (!this.allGames.length) return null;
    const currentId = this.getCurrentMissionId();
    const choices = this.allGames.filter(g => this.getGameKey(g) !== currentId);
    const pool = choices.length ? choices : this.allGames;
    const nextGame = pool[Math.floor(Math.random() * pool.length)];
    this.activateGame(nextGame, false);
    this.errorSubject.next(null);
    this.saveGame();
    return nextGame;
  }

  selectMissionById(gameId: string): boolean {
    const found = this.allGames.find(g => this.getGameKey(g) === gameId);
    if (!found) return false;
    this.activateGame(found, false);
    this.errorSubject.next(null);
    this.saveGame();
    return true;
  }

  selectChoice(choice: Choice): void {
    const current = this.getCurrentQuestionSnapshot();
    if (!current) return;
    const next = this.lookup.get(choice.nextQuestionId);
    if (!next) {
      this.errorSubject.next(`Invalid branch: ${choice.nextQuestionId}`);
      return;
    }

    const prev = this.stateSubject.value;
    const now = new Date();

    const pathEntry = `[${current.id}] ${choice.option} -> ${next.id}`;
    const usedKey = this.makeChoiceKey(current.id, choice.option);

    const nextState: GameState = {
      ...prev,
      currentQuestionId: next.id,
      history: [...prev.history, next.id],
      branchDepth: prev.branchDepth + 1,
      pathTaken: [...prev.pathTaken, pathEntry],
      usedChoiceKeys: Array.from(new Set([...prev.usedChoiceKeys, usedKey]))
    };

    const evaluation = this.evaluateQuestionStatus(next);

    if (evaluation === 'won') {
      nextState.gameStatus = 'won';
      nextState.completedBranches = Array.from(new Set([...prev.completedBranches, next.id]));
      nextState.endTime = now;
    } else if (evaluation === 'failed') {
      nextState.gameStatus = 'failed';
      nextState.completedBranches = Array.from(new Set([...prev.completedBranches, next.id]));
      nextState.endTime = now;
    } else {
      nextState.gameStatus = 'playing';
      nextState.endTime = undefined;
    }

    this.stateSubject.next(nextState);
    this.saveGame();
  }

  resetGame(): void {
    const data = this.gameDataSubject.value;
    const startId = data?.startQuestionId ?? 'Q1';
    const previousAttempts = this.stateSubject.value.attempts ?? 1;

    const next = initialState(startId);
    next.attempts = previousAttempts + 1;
    this.stateSubject.next(next);
    this.errorSubject.next(null);
    this.saveGame();
  }

  restartFresh(): void {
    const data = this.gameDataSubject.value;
    const startId = data?.startQuestionId ?? 'Q1';
    this.stateSubject.next(initialState(startId));
    this.errorSubject.next(null);
    this.saveGame();
  }

  useHint(): boolean {
    const state = this.stateSubject.value;
    if (state.hintsRemaining <= 0) return false;
    this.stateSubject.next({
      ...state,
      hintsRemaining: state.hintsRemaining - 1,
      hintsUsed: state.hintsUsed + 1
    });
    this.saveGame();
    return true;
  }

  getChoiceProbabilities(question: Question | null): Record<string, number> {
    if (!question) return {};
    const scores = question.choices.map(c => this.scoreChoice(question, c));
    const sum = scores.reduce((a, b) => a + b, 0) || 1;
    return question.choices.reduce<Record<string, number>>((acc, c, idx) => {
      acc[c.option] = Math.round((scores[idx] / sum) * 100);
      return acc;
    }, {});
  }

  getStatistics(): GameStatistics {
    const data = this.gameDataSubject.value;
    const state = this.stateSubject.value;
    const elapsedMs = (state.endTime ?? new Date()).getTime() - state.startTime.getTime();
    const achievements = this.getAchievements();

    const correctChoices = state.pathTaken.filter(step =>
      /-> (O6\.1|O6\.2|Q2|Q3|Q5|Q6)\b/.test(step)
    ).length;

    const totalQuestions = data?.questions.length ?? 0;
    const successRate = totalQuestions ? Math.min(100, Math.round((correctChoices / Math.max(1, state.pathTaken.length)) * 100)) : 0;

    return {
      totalQuestions,
      correctChoices,
      timeElapsed: Math.max(0, Math.floor(elapsedMs / 1000)),
      pathComplexity: new Set(state.history).size,
      successRate,
      attempts: state.attempts,
      hintsUsed: state.hintsUsed,
      pathTaken: state.pathTaken,
      achievements
    };
  }

  getAchievements(): string[] {
    const state = this.stateSubject.value;
    const current = this.getCurrentQuestionSnapshot();
    const elapsedSec = Math.floor(((state.endTime ?? new Date()).getTime() - state.startTime.getTime()) / 1000);
    const out = new Set<string>();

    if (state.gameStatus === 'won' || current?.result === 'partial') out.add('Mission Resolved');
    if (elapsedSec > 0 && elapsedSec < 180 && state.gameStatus === 'won') out.add('Speed Runner');
    if (!state.pathTaken.some(p => /Brute-force|spray|PsExec/i.test(p))) out.add('Stealth Operator');
    if (state.hintsUsed === 0 && (state.gameStatus === 'won' || current?.result === 'partial')) out.add('No-Help Ninja');
    if (state.pathTaken.some(p => /OSINT|job postings|Sublist3r/i.test(p))) out.add('Recon First');
    if (state.pathTaken.some(p => /Kerberoast|SPN hash/i.test(p))) out.add('Roaster Master');

    return [...out];
  }

  exportPathMarkdown(): string {
    const data = this.gameDataSubject.value;
    const stats = this.getStatistics();
    const state = this.stateSubject.value;
    const current = this.getCurrentQuestionSnapshot();
    const missionInfo = this.missionInfoSubject.value;
    const lines = [
      `# ${data?.title ?? 'Red Team Simulation'} - Attack Path Report`,
      '',
      `- Mission Pack: ${this.packTitle ?? 'N/A'}`,
      `- Mission Slot: ${missionInfo.count > 1 ? `${missionInfo.index + 1}/${missionInfo.count}` : '1/1'}`,
      `- Status: ${state.gameStatus.toUpperCase()}${current?.result ? ` (${current.result})` : ''}`,
      `- Current Node: ${state.currentQuestionId}`,
      `- Attempts: ${stats.attempts}`,
      `- Time Elapsed: ${stats.timeElapsed}s`,
      `- Hints Used: ${stats.hintsUsed}`,
      '',
      '## Path Taken',
      ...(stats.pathTaken.length ? stats.pathTaken.map((p, i) => `${i + 1}. ${p}`) : ['- No moves recorded']),
      '',
      '## Achievements',
      ...(stats.achievements.length ? stats.achievements.map(a => `- ${a}`) : ['- None']),
      ''
    ];
    return lines.join('\n');
  }

  saveGame(): void {
    try {
      const payload = {
        currentMissionId: this.getCurrentMissionId(),
        state: this.serializeState(this.stateSubject.value)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to save game', err);
    }
  }

  loadGame(): void {
    if (!this.gameDataSubject.value) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const startId = this.gameDataSubject.value.startQuestionId;
        this.stateSubject.next(initialState(startId));
        return;
      }

      const parsed = JSON.parse(raw) as { state?: any; currentMissionId?: string };

      if (parsed.currentMissionId) {
        const savedMission = this.allGames.find(g => this.getGameKey(g) === parsed.currentMissionId);
        if (savedMission && this.getGameKey(savedMission) !== this.getCurrentMissionId()) {
          this.activateGame(savedMission, false);
        }
      }

      if (!parsed?.state) {
        this.stateSubject.next(initialState(this.gameDataSubject.value.startQuestionId));
        return;
      }

      const revived = this.deserializeState(parsed.state);
      if (!this.lookup.has(revived.currentQuestionId)) {
        this.stateSubject.next(initialState(this.gameDataSubject.value.startQuestionId));
        return;
      }
      this.stateSubject.next(revived);
    } catch (err) {
      console.warn('Failed to load saved game', err);
    }
  }

  clearSavedGame(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  getMaxDepthEstimate(): number {
    const data = this.gameDataSubject.value;
    if (!data) return 0;
    const seenMemo = new Map<string, number>();
    const dfs = (id: string, stack = new Set<string>()): number => {
      if (stack.has(id)) return 0;
      if (seenMemo.has(id)) return seenMemo.get(id)!;
      const q = this.lookup.get(id);
      if (!q || q.choices.length === 0) {
        seenMemo.set(id, 1);
        return 1;
      }
      const nextStack = new Set(stack);
      nextStack.add(id);
      const best = 1 + Math.max(...q.choices.map(c => dfs(c.nextQuestionId, nextStack)));
      seenMemo.set(id, best);
      return best;
    };
    return dfs(data.startQuestionId);
  }

  private bootstrapMissionPack(payload: GameLoadResult): void {
    this.allGames = payload.games ?? [payload.activeGame];
    this.isMissionPack = payload.isMissionPack;
    this.packTitle = payload.packTitle;
    this.packDescription = payload.packDescription;
    this.activateGame(payload.activeGame, false);
  }

  private activateGame(gameData: GameData, preserveAttempts: boolean): void {
    this.gameDataSubject.next(gameData);
    this.lookup = new Map(gameData.questions.map(q => [q.id, q]));
    this.updateMissionInfo();

    const attempts = preserveAttempts ? this.stateSubject.value.attempts : 1;
    const nextState = initialState(gameData.startQuestionId);
    nextState.attempts = attempts;
    this.stateSubject.next(nextState);
  }

  private updateMissionInfo(): void {
    const current = this.gameDataSubject.value;
    const currentKey = current ? this.getGameKey(current) : '';
    const index = Math.max(0, this.allGames.findIndex(g => this.getGameKey(g) === currentKey));
    this.missionInfoSubject.next({
      count: Math.max(1, this.allGames.length),
      index: index < 0 ? 0 : index,
      isMissionPack: this.isMissionPack,
      packTitle: this.packTitle
    });
  }

  private getGameKey(game: GameData): string {
    const explicitId = (game as any).id;
    if (typeof explicitId === 'string' && explicitId.trim()) return explicitId.trim();
    return `${game.title}::${game.startQuestionId}`;
  }

  private evaluateQuestionStatus(question: Question): 'playing' | 'won' | 'failed' {
    const text = question.text.toLowerCase();
    const terminal = question.choices.length === 0;
    if (question.result === 'win') return 'won';
    if (question.result === 'fail' && (terminal || /restart/i.test(question.choices[0]?.option ?? ''))) return 'failed';
    if (question.result === 'partial' && terminal) return 'won';
    if (terminal) {
      if (text.includes('win')) return 'won';
      if (text.includes('fail')) return 'failed';
    }
    return 'playing';
  }

  private scoreChoice(question: Question, choice: Choice): number {
    const t = `${question.text} ${choice.option}`.toLowerCase();
    let score = 10;
    if (/osint|enumerate|manual|recon|permissions|check/i.test(t)) score += 18;
    if (/brute-force|spray|psexec/i.test(t)) score -= 8;
    if (/abort|move on|avoid/i.test(choice.option)) score += 2;
    if (/detected|lockout|banned/.test(this.lookup.get(choice.nextQuestionId)?.text.toLowerCase() ?? '')) score -= 15;
    if (/success|win|domain admin|exfil/.test(this.lookup.get(choice.nextQuestionId)?.text.toLowerCase() ?? '')) score += 12;
    return Math.max(1, score);
  }

  private makeChoiceKey(questionId: string, option: string): string {
    return `${questionId}::${option}`;
  }

  private serializeState(state: GameState) {
    return {
      ...state,
      startTime: state.startTime.toISOString(),
      endTime: state.endTime?.toISOString()
    };
  }

  private deserializeState(state: any): GameState {
    return {
      ...state,
      startTime: new Date(state.startTime),
      endTime: state.endTime ? new Date(state.endTime) : undefined
    } as GameState;
  }
}
