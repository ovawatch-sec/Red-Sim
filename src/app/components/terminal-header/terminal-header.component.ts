import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-terminal-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './terminal-header.component.html',
  styleUrls: ['./terminal-header.component.scss']
})
export class TerminalHeaderComponent {
  @Input() title = 'RED TEAM SIM v1.0';
  @Input() mission = 'Project Chimera';
  @Input() status: 'playing' | 'won' | 'failed' = 'playing';
  @Input() hintsRemaining = 3;
  @Input() elapsedSeconds = 0;
  @Input() missionCount = 1;
  @Input() missionIndex = 0;
  @Input() isMissionPack = false;

  @Output() reset = new EventEmitter<void>();
  @Output() newMission = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() load = new EventEmitter<void>();
  @Output() exportPath = new EventEmitter<void>();
  @Output() toggleBrief = new EventEmitter<void>();

  get statusLabel(): string {
    if (this.status === 'won') return 'MISSION COMPLETE';
    if (this.status === 'failed') return 'DETECTED';
    return 'IN PROGRESS';
  }

  get missionSlotLabel(): string {
    return `${Math.min(this.missionIndex + 1, Math.max(this.missionCount, 1))}/${Math.max(this.missionCount, 1)}`;
  }
}
