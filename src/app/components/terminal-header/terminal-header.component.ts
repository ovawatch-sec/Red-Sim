import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MissionOption } from '../../models/game.models';

@Component({
  selector: 'app-terminal-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './terminal-header.component.html',
  styleUrls: ['./terminal-header.component.scss']
})
export class TerminalHeaderComponent {
  @Input() title = 'Red Team Simulation';
  @Input() mission = 'Project Chimera';
  @Input() status: 'playing' | 'won' | 'failed' = 'playing';
  @Input() hintsRemaining = 3;
  @Input() elapsedSeconds = 0;
  @Input() missionCount = 1;
  @Input() missionIndex = 0;
  @Input() isMissionPack = false;
  @Input() currentMissionId = '';
  @Input() missionOptions: MissionOption[] = [];

  @Output() reset = new EventEmitter<void>();
  @Output() newMission = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() load = new EventEmitter<void>();
  @Output() exportPath = new EventEmitter<void>();
  @Output() toggleBrief = new EventEmitter<void>();
  @Output() missionSelected = new EventEmitter<string>();

  get statusLabel(): string {
    if (this.status === 'won') return 'Mission complete';
    if (this.status === 'failed') return 'Detection event';
    return 'Operation live';
  }

  get statusTone(): string {
    if (this.status === 'won') return 'success';
    if (this.status === 'failed') return 'danger';
    return 'neutral';
  }

  get missionSlotLabel(): string {
    return `${Math.min(this.missionIndex + 1, Math.max(this.missionCount, 1))}/${Math.max(this.missionCount, 1)}`;
  }

  onMissionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement)?.value;
    if (value) {
      this.missionSelected.emit(value);
    }
  }
}
