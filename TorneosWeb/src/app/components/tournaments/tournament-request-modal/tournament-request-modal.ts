import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnrollmentRequestService } from '../../../services/enrollment-request.service';
import { Team } from '../../../models/team';

@Component({
  selector: 'app-tournament-request-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-request-modal.html'
})
export class TournamentRequestModalComponent {
  @Input() tournament: any = null;
  @Input() teamsList: Team[] = [];
  @Input() activeSportId: number | undefined = 0;

  @Output() requested = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  requestMode: 'choose' | 'existing' | 'new' = 'choose';
  requestSelectedTeamId: number | null = null;
  requesting: boolean = false;
  errorMessage: string = '';

  newTeamRequest: { name: string; captainName: string; logoUrl: string; stadiumId: number | null } = {
    name: '', captainName: '', logoUrl: '', stadiumId: null
  };
  newTeamPlayers: { firstName: string; lastName: string; jerseyNumber: number }[] = [];

  constructor(
    private enrollmentRequestService: EnrollmentRequestService,
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
    return this.teamsList.filter(team => {
      if (team.sportId !== this.activeSportId) return false;
      if (enrolledIds.has(team.id)) return false;
      if (this.needsStadium() && !team.stadiumId) return false;
      return true;
    });
  }

  setMode(mode: 'choose' | 'existing' | 'new') {
    this.requestMode = mode;
    this.errorMessage = '';
    if (mode === 'new') {
      this.newTeamRequest = { name: '', captainName: '', logoUrl: '', stadiumId: null };
      this.newTeamPlayers = [{ firstName: '', lastName: '', jerseyNumber: 1 }];
    }
    this.cdr.detectChanges();
  }

  selectTeam(team: Team) {
    this.requestSelectedTeamId = team.id;
    this.cdr.detectChanges();
  }

  addPlayer() {
    const nextNum = this.newTeamPlayers.length > 0
      ? Math.max(...this.newTeamPlayers.map(p => p.jerseyNumber)) + 1
      : 1;
    this.newTeamPlayers.push({ firstName: '', lastName: '', jerseyNumber: nextNum });
    this.cdr.detectChanges();
  }

  removePlayer(index: number) {
    this.newTeamPlayers.splice(index, 1);
    this.cdr.detectChanges();
  }

  submitWithExisting() {
    if (!this.requestSelectedTeamId || !this.tournament) return;
    const team = this.teamsList.find(t => t.id === this.requestSelectedTeamId);
    const tournament = this.tournament as any;

    if (tournament.minPlayersPerTeam > 0 && (!team?.players || team.players.length < tournament.minPlayersPerTeam)) {
      this.errorMessage = `Team '${team?.name}' has ${team?.players?.length ?? 0} players, but '${tournament.name}' requires at least ${tournament.minPlayersPerTeam}.`;
      this.cdr.detectChanges();
      return;
    }
    if (tournament.minPrestigeRequired > 0 && (team?.prestigePoints ?? 0) < tournament.minPrestigeRequired) {
      this.errorMessage = `Team '${team?.name}' has ${team?.prestigePoints ?? 0} prestige points, but '${tournament.name}' requires at least ${tournament.minPrestigeRequired}.`;
      this.cdr.detectChanges();
      return;
    }
    if (this.needsStadium() && !team?.stadiumId) {
      this.errorMessage = `Team '${team?.name}' does not have a home stadium, but '${tournament.name}' uses home & away format.`;
      this.cdr.detectChanges();
      return;
    }

    this.requesting = true;
    this.errorMessage = '';

    this.enrollmentRequestService.create({
      teamId: this.requestSelectedTeamId,
      tournamentId: this.tournament.id
    }).subscribe({
      next: () => {
        this.requesting = false;
        this.requested.emit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.requesting = false;
        this.errorMessage = err.error?.message || 'Could not send the enrollment request.';
        this.cdr.detectChanges();
      }
    });
  }

  submitWithNew() {
    if (!this.tournament) return;
    if (!this.newTeamRequest.name.trim()) {
      this.errorMessage = 'Team name is required.';
      this.cdr.detectChanges();
      return;
    }
    if (this.newTeamPlayers.length === 0) {
      this.errorMessage = 'You must add at least one player.';
      this.cdr.detectChanges();
      return;
    }
    if (this.newTeamPlayers.some(p => !p.firstName.trim() || !p.lastName.trim())) {
      this.errorMessage = 'All players must have a first and last name.';
      this.cdr.detectChanges();
      return;
    }

    const tournament = this.tournament as any;
    if (tournament.minPlayersPerTeam > 0 && this.newTeamPlayers.length < tournament.minPlayersPerTeam) {
      this.errorMessage = `You need at least ${tournament.minPlayersPerTeam} players for '${tournament.name}', but you only added ${this.newTeamPlayers.length}.`;
      this.cdr.detectChanges();
      return;
    }
    if (this.needsStadium() && !this.newTeamRequest.stadiumId) {
      this.errorMessage = `'${tournament.name}' requires a home stadium, but you didn't assign one to the new team.`;
      this.cdr.detectChanges();
      return;
    }
    if (tournament.minPrestigeRequired > 100) {
      this.errorMessage = `'${tournament.name}' requires ${tournament.minPrestigeRequired} prestige points, but new teams start with 100.`;
      this.cdr.detectChanges();
      return;
    }

    const captainName = this.newTeamRequest.captainName ||
      (this.newTeamPlayers[0]?.firstName + ' ' + this.newTeamPlayers[0]?.lastName).trim();

    this.requesting = true;
    this.errorMessage = '';

    this.enrollmentRequestService.create({
      tournamentId: this.tournament.id,
      newTeamName: this.newTeamRequest.name.trim(),
      newTeamCaptainName: captainName,
      newTeamLogoUrl: this.newTeamRequest.logoUrl || '',
      newTeamStadiumId: this.newTeamRequest.stadiumId || undefined,
      newTeamPlayers: this.newTeamPlayers.map(p => ({
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        jerseyNumber: p.jerseyNumber
      }))
    }).subscribe({
      next: () => {
        this.requesting = false;
        this.requested.emit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.requesting = false;
        this.errorMessage = err.error?.message || 'Could not send the enrollment request.';
        this.cdr.detectChanges();
      }
    });
  }

  close() {
    this.requestMode = 'choose';
    this.requestSelectedTeamId = null;
    this.errorMessage = '';
    this.requesting = false;
    this.newTeamRequest = { name: '', captainName: '', logoUrl: '', stadiumId: null };
    this.newTeamPlayers = [];
    this.closed.emit();
  }
}
