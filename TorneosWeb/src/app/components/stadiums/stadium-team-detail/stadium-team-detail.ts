import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stadium-team-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stadium-team-detail.html'
})
export class StadiumTeamDetailComponent {
  @Input() team: any = null;

  @Output() back = new EventEmitter<void>();

  teamState = { players: false, tournaments: false, matches: false };

  getStatusLabel(status: number): string {
    switch (status) {
      case 0: return 'Registration';
      case 1: return 'In Progress';
      case 2: return 'Finished';
      default: return 'Unknown';
    }
  }

  goBack() {
    this.back.emit();
  }
}
