export interface Choice {
  option: string;
  nextQuestionId: string;
  isFailure?: boolean;
  isWin?: boolean;
  hint?: string;
}

export interface Question {
  id: string;
  text: string;
  choices: Choice[];
  result?: "win" | "fail" | "partial" | "intel";
  flag?: string;
}

export interface GameMissionBrief {
  objective: string;
  crownJewel: string;
  environment: string;
  constraints: string;
  defenses: string;
}

export interface GameData {
  id?: string;
  title: string;
  description: string;
  missionBrief?: GameMissionBrief;
  startQuestionId: string;
  questions: Question[];
}

export interface MissionPackGame extends GameData {
  id: string;
}

export interface MissionPackData {
  mode?: "mission-pack";
  title?: string;
  description?: string;
  games: MissionPackGame[];
}

export interface GameDataEnvelope {
  gameData: GameData | MissionPackData;
}

export interface GameLoadResult {
  activeGame: GameData;
  games: GameData[];
  isMissionPack: boolean;
  packTitle?: string;
  packDescription?: string;
}

export interface GameState {
  currentQuestionId: string;
  history: string[];
  branchDepth: number;
  completedBranches: string[];
  gameStatus: "playing" | "won" | "failed";
  startTime: Date;
  endTime?: Date;
  pathTaken: string[];
  attempts: number;
  hintsRemaining: number;
  hintsUsed: number;
  usedChoiceKeys: string[];
}

export interface GameStatistics {
  totalQuestions: number;
  correctChoices: number;
  timeElapsed: number;
  pathComplexity: number;
  successRate: number;
  attempts: number;
  hintsUsed: number;
  pathTaken: string[];
  achievements: string[];
}
