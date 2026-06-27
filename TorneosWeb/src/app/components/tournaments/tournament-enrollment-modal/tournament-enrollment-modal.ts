import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { EnrollmentRequestService } from '../../../services/enrollment-request.service';
import { TeamService } from '../../../services/team.service';
import { PlayerService } from '../../../services/player.service';
import { Team } from '../../../models/team';
import { Tournament } from '../../../models/tournament';
import { Stadium } from '../../../models/stadium';

@Component({
  selector: 'app-tournament-enrollment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-enrollment-modal.html'
})
export class TournamentEnrollmentModalComponent {
  @Input() tournament: Tournament | null = null;
  @Input() teamsList: Team[] = [];
  @Input() activeSportId: number | undefined = 0;
  @Input() stadiumsList: Stadium[] = [];

  @Output() completed = new EventEmitter<{ isAdmin: boolean }>();
  @Output() closed = new EventEmitter<void>();

  isAdmin: boolean = false;

  mode: 'choose' | 'existing' | 'new' = 'choose';
  selectedTeamId: number | null = null;
  searchTerm: string = '';

  newTeam: { name: string; captainName: string; logoUrl: string; stadiumId: number | null } = {
    name: '', captainName: '', logoUrl: '', stadiumId: null
  };
  newTeamPlayers: { firstName: string; lastName: string; jerseyNumber: number }[] = [];

  submitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private enrollmentService: EnrollmentService,
    private enrollmentRequestService: EnrollmentRequestService,
    private teamService: TeamService,
    private playerService: PlayerService,
    private cdr: ChangeDetectorRef
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  private needsStadium(): boolean {
    return this.tournament?.venueConfig === 0 || this.tournament?.venueConfig === 1;
  }

  get isTennis(): boolean {
    return this.activeSportId === 3;
  }

  get availableTeams(): Team[] {
    if (!this.tournament) return [];
    const enrolledIds = new Set<number>();
    (this.tournament._enrolledTeams || []).forEach(team => enrolledIds.add(team.id));
    (this.tournament.teamTournaments || []).forEach(tt => {
      if (tt.teamId) enrolledIds.add(tt.teamId);
      if (tt.team?.id) enrolledIds.add(tt.team.id);
    });
    return this.teamsList.filter(t => {
      if (t.sportId !== this.activeSportId) return false;
      if (enrolledIds.has(t.id)) return false;
      return true;
    });
  }

  get filteredTeams(): Team[] {
    if (!this.searchTerm.trim()) return this.availableTeams;
    const term = this.searchTerm.toLowerCase();
    return this.availableTeams.filter(t => t.name.toLowerCase().includes(term));
  }

  teamMeetsRequirements(team: Team): { ok: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const t = this.tournament;
    if (!t) return { ok: true, reasons: [] };

    if (t.minPrestigeRequired > 0 && (team.prestigePoints ?? 0) < t.minPrestigeRequired)
      reasons.push(`Needs ${t.minPrestigeRequired}⭐ prestige (has ${team.prestigePoints ?? 0})`);

    const pc = team.playerCount ?? 0;
    if (t.minPlayersPerTeam > 0 && pc < t.minPlayersPerTeam)
      reasons.push(`Needs at least ${t.minPlayersPerTeam} players (has ${pc})`);
    if (t.maxPlayersPerTeam > 0 && pc > t.maxPlayersPerTeam)
      reasons.push(`Allows at most ${t.maxPlayersPerTeam} players (has ${pc})`);

    if (this.activeSportId !== 3 && (t.venueConfig === 0 || t.venueConfig === 1)) {
      if (!team.stadiumId)
        reasons.push('Requires a home stadium');
    }

    return { ok: reasons.length === 0, reasons };
  }

  get validTeams(): Team[] {
    return this.filteredTeams.filter(t => this.teamMeetsRequirements(t).ok);
  }

  get invalidTeams(): Team[] {
    return this.filteredTeams.filter(t => !this.teamMeetsRequirements(t).ok);
  }

  get canAddPlayer(): boolean {
    const max = this.tournament?.maxPlayersPerTeam ?? 0;
    return max === 0 || this.newTeamPlayers.length < max;
  }

  get submitLabel(): string {
    if (this.submitting) return 'Processing...';
    if (this.mode === 'new') return this.isAdmin ? 'Create & Enroll' : 'Create & Request';
    return this.isAdmin ? 'Enroll Team' : 'Send Request';
  }

  get statusText(): string {
    return this.isAdmin ? 'enroll in' : 'request enrollment in';
  }

  setMode(m: 'choose' | 'existing' | 'new') {
    this.mode = m;
    this.errorMessage = '';
    if (m === 'new') {
      this.newTeam = { name: '', captainName: '', logoUrl: '', stadiumId: null };
      this.newTeamPlayers = [{ firstName: '', lastName: '', jerseyNumber: 1 }];
    }
    this.cdr.detectChanges();
  }

  selectTeam(team: Team) {
    this.selectedTeamId = team.id;
    this.cdr.detectChanges();
  }

  addPlayer() {
    if (!this.canAddPlayer) return;
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

  submit() {
    if (this.mode === 'existing') this.submitExisting();
    else this.submitNew();
  }

  private submitExisting() {
    if (!this.selectedTeamId || !this.tournament) return;
    const tournament = this.tournament;

    this.submitting = true;
    this.errorMessage = '';

    const doEnroll = () => {
      const action = this.isAdmin
        ? this.enrollmentService.enroll(this.selectedTeamId!, tournament.id)
        : this.enrollmentRequestService.create({ teamId: this.selectedTeamId!, tournamentId: tournament.id });

      action.subscribe({
        next: () => this.onSuccess(),
        error: (err) => this.onError(err)
      });
    };

    this.teamService.getDetails(this.selectedTeamId).subscribe({
      next: (details) => {
        const playerCount = (details.players || []).length;

        if (tournament.minPlayersPerTeam > 0 && playerCount < tournament.minPlayersPerTeam) {
          this.errorMessage = `Team '${details.name}' has ${playerCount} players, but '${tournament.name}' requires at least ${tournament.minPlayersPerTeam}.`;
          this.submitting = false;
          this.cdr.detectChanges();
          return;
        }
        if (tournament.maxPlayersPerTeam > 0 && playerCount > tournament.maxPlayersPerTeam) {
          this.errorMessage = `Team '${details.name}' has ${playerCount} players, but '${tournament.name}' allows at most ${tournament.maxPlayersPerTeam}.`;
          this.submitting = false;
          this.cdr.detectChanges();
          return;
        }
        if (tournament.minPrestigeRequired > 0 && (details.prestigePoints ?? 0) < tournament.minPrestigeRequired) {
          this.errorMessage = `Team '${details.name}' has ${details.prestigePoints ?? 0} prestige, but '${tournament.name}' requires at least ${tournament.minPrestigeRequired}.`;
          this.submitting = false;
          this.cdr.detectChanges();
          return;
        }
        if (this.needsStadium() && !details.stadiumId) {
          this.errorMessage = `Team '${details.name}' does not have a home stadium, but '${tournament.name}' requires one.`;
          this.submitting = false;
          this.cdr.detectChanges();
          return;
        }

        doEnroll();
      },
      error: () => {
        doEnroll();
      }
    });
  }

  private submitNew() {
    if (!this.tournament) return;

    if (!this.newTeam.name.trim()) {
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
    const jerseySet = new Set(this.newTeamPlayers.map(p => p.jerseyNumber));
    if (jerseySet.size !== this.newTeamPlayers.length) {
      this.errorMessage = 'Each player must have a unique jersey number within the team.';
      this.cdr.detectChanges();
      return;
    }

    const tournament = this.tournament;
    if (tournament.minPlayersPerTeam > 0 && this.newTeamPlayers.length < tournament.minPlayersPerTeam) {
      this.errorMessage = `You need at least ${tournament.minPlayersPerTeam} players for '${tournament.name}'.`;
      this.cdr.detectChanges();
      return;
    }
    if (tournament.maxPlayersPerTeam > 0 && this.newTeamPlayers.length > tournament.maxPlayersPerTeam) {
      this.errorMessage = `You can add at most ${tournament.maxPlayersPerTeam} players for '${tournament.name}'.`;
      this.cdr.detectChanges();
      return;
    }
    if (this.needsStadium() && !this.newTeam.stadiumId) {
      this.errorMessage = `'${tournament.name}' requires a home stadium for the new team.`;
      this.cdr.detectChanges();
      return;
    }
    if (!this.isAdmin && tournament.minPrestigeRequired > 100) {
      this.errorMessage = `'${tournament.name}' requires ${tournament.minPrestigeRequired} prestige, but new teams start with 100.`;
      this.cdr.detectChanges();
      return;
    }

    const captainName = this.newTeam.captainName ||
      (this.newTeamPlayers[0]?.firstName + ' ' + this.newTeamPlayers[0]?.lastName).trim();

    this.submitting = true;
    this.errorMessage = '';

    if (this.isAdmin) {
      this.teamService.create({
        name: this.newTeam.name.trim(),
        captainName,
        logoUrl: this.newTeam.logoUrl || '',
        prestigePoints: 100,
        sportId: this.activeSportId || 1,
        stadiumId: this.newTeam.stadiumId || undefined
      }).subscribe({
        next: (created) => this.createPlayersAndEnroll(created.id, tournament.id),
        error: (err) => this.onError(err)
      });
    } else {
      this.enrollmentRequestService.create({
        tournamentId: tournament.id,
        newTeamName: this.newTeam.name.trim(),
        newTeamCaptainName: captainName,
        newTeamLogoUrl: this.newTeam.logoUrl || '',
        newTeamStadiumId: this.newTeam.stadiumId || undefined,
        newTeamPlayers: this.newTeamPlayers.map(p => ({
          firstName: p.firstName.trim(),
          lastName: p.lastName.trim(),
          jerseyNumber: p.jerseyNumber
        }))
      }).subscribe({
        next: () => this.onSuccess(),
        error: (err) => this.onError(err)
      });
    }
  }

  private createPlayersAndEnroll(teamId: number, tournamentId: number) {
    if (this.newTeamPlayers.length === 0) {
      this.enrollmentService.enroll(teamId, tournamentId).subscribe({
        next: () => this.onSuccess(),
        error: (err) => this.onError(err)
      });
      return;
    }

    let completed = 0;
    for (const p of this.newTeamPlayers) {
      this.playerService.create({
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        jerseyNumber: p.jerseyNumber,
        teamId
      }).subscribe({
        next: () => {
          completed++;
          if (completed === this.newTeamPlayers.length) {
            this.enrollmentService.enroll(teamId, tournamentId).subscribe({
              next: () => this.onSuccess(),
              error: (err) => this.onError(err)
            });
          }
        },
        error: () => {
          completed++;
          if (completed === this.newTeamPlayers.length) {
            this.enrollmentService.enroll(teamId, tournamentId).subscribe({
              next: () => this.onSuccess(),
              error: (err) => this.onError(err)
            });
          }
        }
      });
    }
  }

  private onSuccess() {
    this.submitting = false;
    this.completed.emit({ isAdmin: this.isAdmin });
    this.cdr.detectChanges();
  }

  private onError(err: any) {
    this.submitting = false;
    this.errorMessage = err.error?.message || err.error?.title || err.message || 'Operation failed. Please try again.';
    this.cdr.detectChanges();
  }

  close() {
    this.mode = 'choose';
    this.selectedTeamId = null;
    this.searchTerm = '';
    this.errorMessage = '';
    this.submitting = false;
    this.newTeam = { name: '', captainName: '', logoUrl: '', stadiumId: null };
    this.newTeamPlayers = [];
    this.closed.emit();
  }
}
