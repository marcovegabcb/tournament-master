import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnrollmentService } from '../../../services/enrollment.service';
import { Team } from '../../../models/team';

@Component({
  selector: 'app-tournament-register-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tournament-register-modal.html'
})
export class TournamentRegisterModalComponent {
  @Input() tournament: any = null;
  @Input() teamsList: Team[] = [];
  @Input() activeSportId: number | undefined = 0;

  @Output() registered = new EventEmitter<{ team: Team; tournament: any }>();
  @Output() closed = new EventEmitter<void>();

  selectedTeamId: number | null = null;
  registering: boolean = false;
  errorMessage: string = '';

  constructor(
    private enrollmentService: EnrollmentService,
    private cdr: ChangeDetectorRef
  ) {}

  private needsStadium(): boolean {
    const venueConfig = (this.tournament as any)?.venueConfig;
    return venueConfig === 0 || venueConfig === 1;
  }

  get availableTeams(): Team[] {
    if (!this.tournament) return [];
    const enrolledIds = new Set<number>();
    const t = this.tournament as any;
    (t._enrolledTeams || []).forEach((team: Team) => enrolledIds.add(team.id));
    (t.teamTournaments || []).forEach((tt: any) => {
      if (tt.teamId) enrolledIds.add(tt.teamId);
      if (tt.team?.id) enrolledIds.add(tt.team.id);
    });
    const minPlayers = t.minPlayersPerTeam || 0;
    const sportId = this.activeSportId;
    return this.teamsList.filter(t => {
      if (t.sportId !== sportId || enrolledIds.has(t.id)) return false;
      if (minPlayers > 0 && (!t.players || t.players.length < minPlayers)) return false;
      if (this.needsStadium() && !t.stadiumId) return false;
      return true;
    });
  }

  selectTeam(team: Team) {
    this.selectedTeamId = team.id;
    this.cdr.detectChanges();
  }

  enroll() {
    if (!this.selectedTeamId || !this.tournament) return;
    this.registering = true;
    this.errorMessage = '';

    this.enrollmentService.enroll(this.selectedTeamId, this.tournament.id).subscribe({
      next: (res: any) => {
        this.registering = false;
        const team = this.teamsList.find(t => t.id === this.selectedTeamId);
        this.registered.emit({ team: team!, tournament: this.tournament });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.registering = false;
        this.errorMessage = err.error?.message || 'Could not enroll team.';
        this.cdr.detectChanges();
      }
    });
  }

  close() {
    this.selectedTeamId = null;
    this.errorMessage = '';
    this.closed.emit();
  }
}
