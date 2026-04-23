import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import {
  Subject,
  combineLatest,
  interval,
  map,
  startWith,
  takeUntil,
} from "rxjs";
import { Choice, GameData, MissionOption, Question } from "../../models/game.models";
import { GameService } from "../../services/game.service";
import { ChoicesGridComponent } from "../choices-grid/choices-grid.component";
import { GameOverComponent } from "../game-over/game-over.component";
import { ProgressBarComponent } from "../progress-bar/progress-bar.component";
import { QuestionCardComponent } from "../question-card/question-card.component";
import { TerminalHeaderComponent } from "../terminal-header/terminal-header.component";

@Component({
  selector: "app-game-container",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TerminalHeaderComponent,
    QuestionCardComponent,
    ChoicesGridComponent,
    ProgressBarComponent,
    GameOverComponent,
  ],
  templateUrl: "./game-container.component.html",
  styleUrls: ["./game-container.component.scss"],
})
export class GameContainerComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly state$ = this.gameService.state$;
  readonly data$ = this.gameService.gameData$;
  readonly currentQuestion$ = this.gameService.getCurrentQuestion();
  readonly loading$ = this.gameService.loading$;
  readonly error$ = this.gameService.error$;
  readonly missionInfo$ = this.gameService.missionInfo$;

  vm$ = combineLatest([
    this.state$,
    this.data$,
    this.currentQuestion$,
    this.missionInfo$,
    this.error$,
    interval(1000).pipe(startWith(0)),
  ]).pipe(
    map(([state, data, question, missionInfo, error]) => {
      const now = state.endTime ?? new Date();
      const elapsedSeconds = Math.floor(
        (now.getTime() - state.startTime.getTime()) / 1000,
      );
      const stats = this.gameService.getStatistics();
      const probabilities =
        this.showHints && this.hintsActivatedForQuestion
          ? this.gameService.getChoiceProbabilities(question)
          : {};

      return {
        state,
        data,
        question,
        missionInfo,
        error,
        elapsedSeconds,
        stats,
        probabilities,
        maxDepth: this.gameService.getMaxDepthEstimate(),
        uniqueVisited: new Set(state.history).size,
        missionCatalog: this.gameService.getMissionCatalog(),
        packDescription: this.gameService.getPackDescription(),
        currentMissionId: this.gameService.getCurrentMissionId(),
      };
    }),
  );

  showBrief = false;
  showHints = false;
  hintsActivatedForQuestion = false;
  hintMessage = "";
  lastQuestionIdForHint = "";

  constructor(private readonly gameService: GameService) {}

  ngOnInit(): void {
    this.gameService
      .ensureInitialized()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onChoiceSelected(choice: Choice): void {
    this.gameService.selectChoice(choice);
    const current = this.gameService.getCurrentQuestionSnapshot();
    if (current?.id !== this.lastQuestionIdForHint) {
      this.hintsActivatedForQuestion = false;
      this.showHints = false;
      this.hintMessage = "";
    }
  }

  resetGame(): void {
    this.gameService.restartFresh();
    this.resetPerQuestionUi();
  }

  newMission(): void {
    const mission = this.gameService.startNewMission();
    this.resetPerQuestionUi();
    this.showBrief = false;
    if (mission) {
      this.hintMessage = `Loaded mission: ${mission.title}`;
    }
  }

  saveGame(): void {
    this.gameService.saveGame();
    this.hintMessage = "Session saved locally.";
  }

  loadGame(): void {
    this.gameService.loadGame();
    this.hintMessage = "Loaded saved session.";
  }

  retryLoad(): void {
    this.gameService
      .loadGameData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.hintMessage = "Mission data refreshed.";
        },
      });
  }

  selectMission(missionId: string): void {
    if (!missionId) return;
    const ok = this.gameService.selectMissionById(missionId);
    if (ok) {
      this.resetPerQuestionUi();
      this.showBrief = false;
      this.hintMessage = "Mission switched.";
    }
  }

  requestHint(question: Question | null): void {
    if (!question) return;
    this.lastQuestionIdForHint = question.id;

    if (this.hintsActivatedForQuestion) {
      this.showHints = !this.showHints;
      return;
    }

    const ok = this.gameService.useHint();
    if (!ok) {
      this.hintMessage = "No hints remaining. You are on your own.";
      this.showHints = false;
      return;
    }

    this.showHints = true;
    this.hintsActivatedForQuestion = true;
    this.hintMessage =
      "Hint consumed. Confidence estimates and route notes unlocked for this decision.";
  }

  exportPath(): void {
    const markdown = this.gameService.exportPathMarkdown();
    const slug = (this.gameService.getCurrentMission()?.title ?? "mission")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug || "mission"}-path-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  onGameOverContinue(index: number): void {
    const q = this.gameService.getCurrentQuestionSnapshot();
    const choice = q?.choices?.[index];
    if (choice) this.gameService.selectChoice(choice);
  }

  isGameOver(question: Question | null): boolean {
    if (!question) return false;
    return (
      question.result === "win" ||
      question.result === "fail" ||
      question.result === "partial" ||
      question.choices.length === 0
    );
  }

  isFailure(question: Question | null): boolean {
    return !!question && question.result === "fail";
  }

  statusBarState(
    question: Question | null,
    stateStatus: "playing" | "won" | "failed",
  ): string {
    if (question?.result === "partial") return "PARTIAL";
    return stateStatus.toUpperCase();
  }

  getMissionBrief(
    data?: GameData | null | undefined,
    missionSlotText?: string,
  ): string | null {
    const prefix = missionSlotText ? `[${missionSlotText}] ` : "";
    const brief =
      data?.missionBrief?.objective || data?.description?.trim() || "";
    return `${prefix}${brief} Authorized simulation only. Goal: achieve objective proof with minimal detection and no destructive actions.`;
  }

  getMissionMeta(data?: GameData | null): Array<{ label: string; value: string }> {
    if (!data) return [];

    return [
      { label: "Sector", value: data.sector || "Multi-sector" },
      { label: "Difficulty", value: data.difficulty || "Custom" },
      { label: "Domain", value: data.domain || "Internal" },
      { label: "Questions", value: String(data.questions?.length ?? 0) },
    ];
  }

  private resetPerQuestionUi(): void {
    this.showHints = false;
    this.hintsActivatedForQuestion = false;
    this.lastQuestionIdForHint = "";
  }
}
