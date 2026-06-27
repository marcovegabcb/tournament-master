import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamDetail } from '../../../models/team-detail';

@Component({
  selector: 'app-stadium-team-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stadium-team-detail.html'
})
export class StadiumTeamDetailComponent {
  @Input() team: TeamDetail | null = null;

  @Output() back = new EventEmitter<void>();

  teamState = { players: false, tournaments: false, matches: false };

  constructor(private cdr: ChangeDetectorRef) {}

  togglePlayers() { this.teamState.players = !this.teamState.players; this.cdr.detectChanges(); }
  toggleTournaments() { this.teamState.tournaments = !this.teamState.tournaments; this.cdr.detectChanges(); }
  toggleMatches() { this.teamState.matches = !this.teamState.matches; this.cdr.detectChanges(); }

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
