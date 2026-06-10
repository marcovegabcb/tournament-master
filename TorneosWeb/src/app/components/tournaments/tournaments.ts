import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../services/tournament.service';
import { StadiumService } from '../../services/stadium.service';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { Tournament } from '../../models/tournament';
import { Team } from '../../models/team';
import { Stadium } from '../../models/stadium';
import { SuccessModalComponent } from '../shared/success-modal/success-modal';
import { ErrorModalComponent } from '../shared/error-modal/error-modal';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb';

import { TournamentListViewComponent } from './tournament-list-view/tournament-list-view';
import { TournamentScheduleViewComponent } from './tournament-schedule-view/tournament-schedule-view';
import { TournamentStandingsViewComponent } from './tournament-standings-view/tournament-standings-view';
import { TournamentCreateModalComponent } from './tournament-create-modal/tournament-create-modal';
import { TournamentRegisterModalComponent } from './tournament-register-modal/tournament-register-modal';
import { TournamentRequestModalComponent } from './tournament-request-modal/tournament-request-modal';

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    SuccessModalComponent, ErrorModalComponent, BreadcrumbComponent,
    TournamentListViewComponent, TournamentScheduleViewComponent, TournamentStandingsViewComponent,
    TournamentCreateModalComponent, TournamentRegisterModalComponent, TournamentRequestModalComponent
  ],
  templateUrl: './tournaments.html',
  styleUrl: './tournaments.css'
})
export class TournamentsComponent implements OnInit, OnChanges {
  @Input() list: Tournament[] = [];
  @Input() activeSportId: number | undefined = 0;
  @Input() sportsList: any[] = [];
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
  showRegisterModal: boolean = false;
  showRequestModal: boolean = false;
  showTeamsModal: boolean = false;
  teamsModalData: any = null;

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
      next: (data) => this.stadiumsList = data,
      error: (err) => console.error('Error loading stadiums:', err)
    });
  }

  private loadTeams() {
    this.teamService.getAll().subscribe({
      next: (data) => this.teamsList = data,
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
      format: 0 as any,
      venueConfig: 0 as any,
      minPrestigeRequired: 0,
      minPlayersPerTeam: 0,
      status: 0 as any,
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
    this.cdr.detectChanges();
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
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

  onOpenRegister(tournament: Tournament) {
    this.selectedTournament = tournament;
    this.showRegisterModal = true;
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
    const tournamentId = this.teamsModalData.id;
    const teamName = this.teamsModalData.teamTournaments?.find((tt: any) =>
      tt.teamId === teamId || tt.team?.id === teamId
    )?.team?.name || 'Team';
    if (!confirm(`Remove "${teamName}" from this tournament?`)) return;

    this.teamService.removeFromTournament(teamId, tournamentId).subscribe({
      next: () => {
        this.teamsModalData.teamTournaments = this.teamsModalData.teamTournaments?.filter((tt: any) =>
          tt.teamId !== teamId && tt.team?.id !== teamId
        ) || [];
        (this.teamsModalData as any)._enrolledCount = this.teamsModalData.teamTournaments.length;
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

  onOpenRequest(tournament: Tournament) {
    this.selectedTournament = tournament;
    this.showRequestModal = true;
    this.cdr.detectChanges();
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
    const currentSport = this.sportsList.find((s: any) => s.id === this.activeSportId);
    if (currentSport) {
      (created as any).sport = { name: currentSport.name };
    }
    this.list.push(created);
    this.successMessage = `Tournament "${created.name}" successfully created!`;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
    this.tournamentCreated.emit();
  }

  // ── Register modal events ───────────────────────────

  onTeamRegistered(event: { team: Team; tournament: any }) {
    this.showRegisterModal = false;
    const t = this.selectedTournament as any;
    if (!t._enrolledTeams) t._enrolledTeams = [];
    t._enrolledTeams.push(event.team);
    t._enrolledCount = (t._enrolledCount || 0) + 1;
    this.successMessage = 'Team successfully enrolled!';
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  // ── Request modal events ────────────────────────────

  onRequestSent() {
    this.showRequestModal = false;
    this.selectedTournament = null;
    this.successMessage = 'Enrollment request sent. Wait for an admin to approve it.';
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  // ── Schedule view events ────────────────────────────

  onFixtureGenerated() {
    if (this.selectedTournament) {
      (this.selectedTournament as any).status = 1;
    }
  }
}
