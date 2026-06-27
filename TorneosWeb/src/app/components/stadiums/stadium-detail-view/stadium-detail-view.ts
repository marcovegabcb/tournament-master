import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StadiumDetail } from '../../../models/stadium-detail';

@Component({
  selector: 'app-stadium-detail-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stadium-detail-view.html'
})
export class StadiumDetailViewComponent {
  @Input() stadium: StadiumDetail | null = null;

  @Output() back = new EventEmitter<void>();
  @Output() teamClick = new EventEmitter<StadiumDetail['teams'][number]>();
  @Output() tournamentClick = new EventEmitter<StadiumDetail['tournaments'][number]>();

  state = { teams: false, tournaments: false };

  constructor(private cdr: ChangeDetectorRef) {}

  /** Sede neutral: ningún equipo la usa como sede propia (incluye todos los estadios de tenis). */
  get isNeutralVenue(): boolean {
    return !this.stadium?.teams?.length;
  }

  getStatusLabel(status: number): string {
    switch (status) {
      case 0: return 'Registration';
      case 1: return 'In Progress';
      case 2: return 'Finished';
      default: return 'Unknown';
    }
  }

  toggleTeams() { this.state.teams = !this.state.teams; this.cdr.detectChanges(); }
  toggleTournaments() { this.state.tournaments = !this.state.tournaments; this.cdr.detectChanges(); }

  onTeamClick(team: StadiumDetail['teams'][number]) {
    this.teamClick.emit(team);
  }

  onTournamentClick(t: StadiumDetail['tournaments'][number]) {
    this.tournamentClick.emit(t);
  }

  goBack() {
    this.back.emit();
  }
}
