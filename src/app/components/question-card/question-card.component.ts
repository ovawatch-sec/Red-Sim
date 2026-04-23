import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Question } from '../../models/game.models';

@Component({
  selector: 'app-question-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './question-card.component.html',
  styleUrls: ['./question-card.component.scss']
})
export class QuestionCardComponent implements OnChanges, OnDestroy {
  @Input() question: Question | null = null;

  displayedText = '';
  private timer: ReturnType<typeof setInterval> | undefined;
  isTyping = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['question']) {
      this.startTyping();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  @HostListener('document:keydown.enter')
  revealImmediately(): void {
    if (!this.isTyping) return;
    this.displayedText = this.question?.text ?? '';
    this.clearTimer();
  }

  onCardClick(): void {
    this.revealImmediately();
  }

  private startTyping(): void {
    this.clearTimer();
    const fullText = this.question?.text ?? '';
    this.displayedText = '';

    if (!fullText) return;

    this.isTyping = true;
    let i = 0;
    this.timer = setInterval(() => {
      i++;
      this.displayedText = fullText.slice(0, i);
      if (i >= fullText.length) {
        this.clearTimer();
      }
    }, 7);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.isTyping = false;
  }

  get isImportant(): boolean {
    return !!this.question && /^Q[2-6]$/.test(this.question.id);
  }

  get isOutcome(): boolean {
    return !!this.question?.id.startsWith('O');
  }

  get phaseLabel(): string {
    return this.question?.phase?.replace(/-/g, ' ') || 'decision';
  }
}
