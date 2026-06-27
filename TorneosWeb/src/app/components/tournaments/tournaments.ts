import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../services/tournament.service';
import { StadiumService } from '../../services/stadium.service';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { Tournament, TournamentStatus } from '../../models/tournament';
import { Team } from '../../models/team';
import { Stadium } from '../../models/stadium';
import { Sport } from '../../models/sport';
import { TeamTournament } from '../../models/team-tournament';
import { SuccessModalComponent } from '../shared/success-modal/success-modal';
import { ErrorModalComponent } from '../shared/error-modal/error-modal';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb';

import { TournamentListViewComponent } from './tournament-list-view/tournament-list-view';
import { TournamentScheduleViewComponent } from './tournament-schedule-view/tournament-schedule-view';
import { TournamentStandingsViewComponent } from './tournament-standings-view/tournament-standings-view';
import { TournamentCreateModalComponent } from './tournament-create-modal/tournament-create-modal';
import { TournamentEnrollmentModalComponent } from './tournament-enrollment-modal/tournament-enrollment-modal';

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    SuccessModalComponent, ErrorModalComponent, BreadcrumbComponent,
    TournamentListViewComponent, TournamentScheduleViewComponent, TournamentStandingsViewComponent,
    TournamentCreateModalComponent, TournamentEnrollmentModalComponent
  ],
  templateUrl: './tournaments.html',
  styleUrl: './tournaments.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentsComponent implements OnInit, OnChanges {
  @Input() list: Tournament[] = [];
  @Input() activeSportId: number | undefined = 0;
  @Input() sportsList: Sport[] = [];
  @Output() tournamentCreated = new EventEmitter<void>();
  @Output() goToGenerator = new EventEmitter<number>();
  @Output() navigateHome = new EventEmitter<void>();

  viewMode: 'list' | 'schedule' | 'standings' = 'list';
  selectedTournament: Tournament | null = null;

  showSuccessModal: boolean = false;
  successMessage: string = '';
  successSecondaryAction: (() => void) | null = null;
  successSecondaryLabel: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  stadiumsList: Stadium[] = [];
  teamsList: Team[] = [];

  // Modal visibility flags
  showCreateModal: boolean = false;
  showEnrollmentModal: boolean = false;
  showTeamsModal: boolean = false;
  teamsModalData: Tournament | null = null;

  constructor(
    private tournamentService: TournamentService,
    private stadiumService: StadiumService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadStadiums();
    this.loadTeams();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeSportId'] && !changes['activeSportId'].firstChange) {
      this.loadStadiums();
    }
  }

  private loadStadiums() {
    this.stadiumService.getAll(this.activeSportId).subscribe({
      next: (data) => {
        this.stadiumsList = data.items;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error loading stadiums:', err)
    });
  }

  private loadTeams() {
    this.teamService.getAll(undefined, 1, 1000).subscribe({
      next: (data) => {
        this.teamsList = data.items;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error loading teams:', err)
    });
  }

  // ── Navigation ──────────────────────────────────────

  showSchedule(tournament: Tournament) {
    this.selectedTournament = tournament;
    this.viewMode = 'schedule';
    this.cdr.detectChanges();
  }

  showStandings(tournament: Tournament) {
    this.selectedTournament = tournament;
    this.viewMode = 'standings';
    this.cdr.detectChanges();
  }

  showScheduleById(id: number) {
    const tournament = this.list.find(t => t.id === id) || {
      id,
      name: 'Tournament',
      format: 0,
      venueConfig: 0,
      minPrestigeRequired: 0,
      minPlayersPerTeam: 0,
      maxPlayersPerTeam: 0,
      status: TournamentStatus.InProgress,
      isFixtureGenerated: false,
      sportId: 0,
      sport: undefined
    } as Tournament;
    this.showSchedule(tournament);
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedTournament = null;
    this.cdr.detectChanges();
  }

  get breadcrumbSegments(): string[] {
    if (this.viewMode === 'list') return ['Home', 'Tournaments'];
    const name = this.selectedTournament?.name || 'Tournament';
    const view = this.viewMode === 'schedule' ? 'Schedule' : 'Standings';
    return ['Home', 'Tournaments', `${name} (${view})`];
  }

  onBreadcrumb(index: number) {
    if (index === 0) this.navigateHome.emit();
    else if (index === 1 && this.viewMode !== 'list') this.backToList();
  }

  // ── Success / Error modals ──────────────────────────

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.successSecondaryAction = null;
    this.successSecondaryLabel = '';
    this.cdr.markForCheck();
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  onSecondaryAction() {
    this.successSecondaryAction?.();
  }

  // ── List view events ────────────────────────────────

  onShowSchedule(tournament: Tournament) {
    this.showSchedule(tournament);
  }

  onShowStandings(tournament: Tournament) {
    this.showStandings(tournament);
  }

  onDeleteTournament(event: { id: number; name: string }) {
    this.tournamentService.delete(event.id).subscribe({
      next: () => {
        this.successMessage = `Tournament "${event.name}" successfully deleted!`;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
        this.tournamentCreated.emit();
      },
      error: (err) => {
        this.errorMessage = 'Could not delete the tournament. It might have matches or teams attached.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  onCloseRegistration(tournament: Tournament) {
    this.tournamentService.updateStatus(tournament.id, 1).subscribe({
      next: () => {
        tournament.status = 1;
        this.successMessage = `Registration closed! "${tournament.name}" is now in progress.`;
        this.successSecondaryAction = () => {
          this.closeSuccessModal();
          this.goToGenerator.emit(tournament.id);
        };
        this.successSecondaryLabel = '⚡ Go to Generator';
        this.showSuccessModal = true;
        this.cdr.detectChanges();
        this.tournamentCreated.emit();
      },
      error: (err) => {
        this.errorMessage = 'Could not close registration.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  onOpenEnrollment(tournament: Tournament) {
    this.selectedTournament = tournament;
    this.showEnrollmentModal = true;
    this.loadTeams();
    this.cdr.detectChanges();
  }

  onViewTeams(tournament: Tournament) {
    this.selectedTournament = tournament;
    this.teamsModalData = tournament;
    this.showTeamsModal = true;
    this.cdr.detectChanges();
  }

  closeTeamsModal() {
    this.showTeamsModal = false;
    this.teamsModalData = null;
    this.selectedTournament = null;
    this.cdr.detectChanges();
  }

  removeTeamFromTournament(teamId: number) {
    if (!this.teamsModalData) return;
    const data = this.teamsModalData;
    const tournamentId = data.id;
    const teamName = data.teamTournaments?.find((tt: TeamTournament) =>
      tt.teamId === teamId || tt.team?.id === teamId
    )?.team?.name || 'Team';
    if (!confirm(`Remove "${teamName}" from this tournament?`)) return;

    this.teamService.removeFromTournament(teamId, tournamentId).subscribe({
      next: () => {
        data.teamTournaments = data.teamTournaments?.filter((tt: TeamTournament) =>
          tt.teamId !== teamId && tt.team?.id !== teamId
        ) || [];
        data._enrolledCount = data.teamTournaments.length;
        this.tournamentCreated.emit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Could not remove team.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  onNavigateHome() {
    this.navigateHome.emit();
  }

  // ── Create modal events ─────────────────────────────

  onCreateTournament() {
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  onTournamentCreated(created: Tournament) {
    this.showCreateModal = false;
    const currentSport = this.sportsList.find(s => s.id === this.activeSportId);
    if (currentSport) {
      created.sport = currentSport;
    }
    this.list.push(created);
    this.successMessage = `Tournament "${created.name}" successfully created!`;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
    this.tournamentCreated.emit();
  }

  // ── Enrollment modal events ─────────────────────────

  onEnrollmentCompleted(event: { isAdmin: boolean }) {
    this.showEnrollmentModal = false;
    this.selectedTournament = null;
    this.successMessage = event.isAdmin
      ? 'Team successfully enrolled!'
      : 'Enrollment request sent. Wait for an admin to approve it.';
    this.showSuccessModal = true;
    this.cdr.detectChanges();
    this.tournamentCreated.emit();
  }

  // ── Schedule view events ────────────────────────────

  onFixtureGenerated() {
    if (this.selectedTournament) {
      this.selectedTournament.status = TournamentStatus.InProgress;
    }
  }

  trackByIndex(index: number): number { return index; }
}
