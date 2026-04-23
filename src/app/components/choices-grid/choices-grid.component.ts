import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Choice } from '../../models/game.models';

@Component({
  selector: 'app-choices-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choices-grid.component.html',
  styleUrls: ['./choices-grid.component.scss']
})
export class ChoicesGridComponent {
  @Input() choices: Choice[] = [];
  @Input() usedChoiceKeys: string[] = [];
  @Input() currentQuestionId = '';
  @Input() probabilities: Record<string, number> = {};
  @Input() showHints = false;

  @Output() choiceSelected = new EventEmitter<Choice>();

  private get allUsed(): boolean {
    if (!this.choices.length) return false;
    return this.choices.every(c => this.isUsed(c));
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    const n = Number(ev.key);
    if (Number.isNaN(n) || n < 1 || n > 9) return;
    const idx = n - 1;
    if (idx >= this.choices.length) return;
    const choice = this.choices[idx];
    if (this.isDisabled(choice)) return;
    this.select(choice);
  }

  select(choice: Choice): void {
    this.choiceSelected.emit(choice);
  }

  isUsed(choice: Choice): boolean {
    return this.usedChoiceKeys.includes(this.choiceKey(choice));
  }

  isDisabled(choice: Choice): boolean {
    return !this.allUsed && this.isUsed(choice);
  }

  choiceKey(choice: Choice): string {
    return `${this.currentQuestionId}::${choice.option}`;
  }

  confidenceLabel(choice: Choice): string {
    const probability = this.probabilities[choice.option] ?? 0;
    if (choice.isFailure || probability <= 20) return 'High exposure';
    if (choice.isWin || probability >= 70) return 'Strong route';
    if (probability >= 45) return 'Balanced route';
    return 'Speculative';
  }

  tone(choice: Choice): string {
    const probability = this.probabilities[choice.option] ?? 0;
    if (choice.isFailure || probability <= 20) return 'danger';
    if (choice.isWin || probability >= 70) return 'success';
    return 'neutral';
  }
}
