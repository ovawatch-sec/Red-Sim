import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { GameStatistics, Question } from '../../models/game.models';

@Component({
  selector: 'app-game-over',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './game-over.component.html',
  styleUrls: ['./game-over.component.scss']
})
export class GameOverComponent {
  @Input() question: Question | null = null;
  @Input() stats: GameStatistics | null = null;

  @Output() restart = new EventEmitter<void>();
  @Output() exportPath = new EventEmitter<void>();
  @Output() continueChoice = new EventEmitter<number>();

  get mode(): 'win' | 'fail' | 'partial' {
    const r = this.question?.result;
    if (r === 'win') return 'win';
    if (r === 'partial') return 'partial';
    return 'fail';
  }

  get isTerminal(): boolean {
    return (this.question?.choices?.length ?? 0) === 0;
  }
}
