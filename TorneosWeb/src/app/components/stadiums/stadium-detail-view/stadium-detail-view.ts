import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stadium-detail-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stadium-detail-view.html'
})
export class StadiumDetailViewComponent {
  @Input() stadium: any = null;

  @Output() back = new EventEmitter<void>();
  @Output() teamClick = new EventEmitter<any>();
  @Output() tournamentClick = new EventEmitter<any>();

  state = { teams: false, tournaments: false };

  getStatusLabel(status: number): string {
    switch (status) {
      case 0: return 'Registration';
      case 1: return 'In Progress';
      case 2: return 'Finished';
      default: return 'Unknown';
    }
  }

  toggleTeams() { this.state.teams = !this.state.teams; }
  toggleTournaments() { this.state.tournaments = !this.state.tournaments; }

  onTeamClick(team: any) {
    this.teamClick.emit(team);
  }

  onTournamentClick(t: any) {
    this.tournamentClick.emit(t);
  }

  goBack() {
    this.back.emit();
  }
}
