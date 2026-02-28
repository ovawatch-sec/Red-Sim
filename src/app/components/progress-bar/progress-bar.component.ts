import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss']
})
export class ProgressBarComponent {
  @Input() depth = 0;
  @Input() maxDepth = 1;
  @Input() attempts = 1;
  @Input() elapsedSeconds = 0;
  @Input() hintsRemaining = 3;
  @Input() uniqueVisited = 0;

  get progress(): number {
    if (!this.maxDepth) return 0;
    return Math.max(0, Math.min(100, Math.round((this.depth / this.maxDepth) * 100)));
  }
}
