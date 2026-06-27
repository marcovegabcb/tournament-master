import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { StadiumService } from '../../services/stadium.service';
import { Team } from '../../models/team';
import { Stadium } from '../../models/stadium';
import { TeamDetail } from '../../models/team-detail';
import { Player } from '../../models/player';
import { SuccessModalComponent } from '../shared/success-modal/success-modal';
import { ErrorModalComponent } from '../shared/error-modal/error-modal';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb';
import { TeamListViewComponent } from './team-list-view/team-list-view';
import { TeamDetailViewComponent } from './team-detail-view/team-detail-view';
import { TeamPlayerDetailComponent } from './team-player-detail/team-player-detail';
import { TeamCreateModalComponent } from './team-create-modal/team-create-modal';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, SuccessModalComponent, ErrorModalComponent, BreadcrumbComponent, TeamListViewComponent, TeamDetailViewComponent, TeamPlayerDetailComponent, TeamCreateModalComponent],
  templateUrl: './teams.html',
  styleUrl: './teams.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamsComponent implements OnInit, OnChanges {
  @Input() activeSportId: number | undefined = 0;
  @Output() navigateHome = new EventEmitter<void>();
  allTeams: Team[] = [];
  stadiumsList: Stadium[] = [];
  loading: boolean = true;

  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  totalCount = 0;

  viewMode: 'list' | 'detail' | 'playerDetail' = 'list';
  selectedTeam: Team | null = null;
  teamDetails: TeamDetail | null = null;
  selectedPlayer: Player | null = null;

  isModalOpen: boolean = false;
  showSuccessModal: boolean = false;
  successMessage: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  constructor(
    private teamService: TeamService,
    private stadiumService: StadiumService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadStadiums();
    (window as any).debugTeams = () => this.diagnoseTeams();
  }

  private diagnoseTeams() {
    console.group('🔍 Team Detail Diagnosis');
    console.log(`Total teams loaded: ${this.allTeams.length}`);
    if (this.allTeams.length === 0) {
      console.warn('No teams loaded yet. Wait for teams to load and try again.');
      console.groupEnd();
      return;
    }
    this.allTeams.forEach(t => {
      const enrollments = t.teamTournaments?.length ?? 0;
      const inLeague = t.teamTournaments?.some(tt => tt.tournament?.status === 0 || tt.tournament?.status === 1 || tt.tournament?.status === 2) ?? false;
      console.log(`📋 ID=${t.id} "${t.name}" | enrollments=${enrollments} | inLeague=${inLeague}`);
      t.teamTournaments?.forEach((tt, i) => {
        console.log(`   └─ Tournament ${i+1}: id=${tt.tournamentId} name="${tt.tournament?.name}" status=${tt.tournament?.status} hasMatches=${(tt.tournament as any)?.matches?.length ?? '?'}`);
      });
    });
    console.info('⬇️  Now testing getDetails for each team...');
    this.allTeams.forEach(t => {
      this.teamService.getDetails(t.id).subscribe({
        next: (d) => console.log(`✅ ID=${t.id} "${t.name}" → OK (${d.tournaments?.length ?? 0} tournaments, ${d.players?.length ?? 0} players)`),
        error: (e) => console.error(`❌ ID=${t.id} "${t.name}" → HTTP ${e.status}`, e.error || e.message)
      });
    });
    console.groupEnd();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeSportId'] && changes['activeSportId'].currentValue != null) {
      this.loadTeams(1);
    }
  }

  loadTeams(page = 1) {
    this.loading = true;
    this.teamService.getAll(this.activeSportId || undefined, page, this.pageSize).subscribe({
      next: (data) => {
        this.allTeams = data.items;
        this.currentPage = data.page;
        this.totalPages = data.totalPages;
        this.totalCount = data.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Could not load teams. Please try again.';
        this.showErrorModal = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.loadTeams(page);
  }

  loadStadiums() {
    this.stadiumService.getAll().subscribe({
      next: (data) => {
        this.stadiumsList = data.items;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Could not load stadiums.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  onTeamCreated(created: Team) {
    this.allTeams.push(created);
    this.isModalOpen = false;
    this.successMessage = `Team "${created.name}" successfully registered!`;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
  }

  showDetails(team: Team) {
    this.selectedTeam = team;
    this.teamDetails = null;
    this.viewMode = 'detail';
    this.cdr.detectChanges();
    this.teamService.getDetails(team.id).subscribe({
      next: (data) => {
        this.teamDetails = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || err.error?.message || err.message || `HTTP ${err.status}: Could not load team details.`;
        if (err.error && typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else if (err.error && typeof err.error === 'object') {
          const extra = JSON.stringify(err.error);
          if (extra !== '{}') this.errorMessage += ` (${extra})`;
        }
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  onDeleteTeam(team: Team) {
    const hasEnrollments = team.teamTournaments?.some(tt =>
      tt.tournament?.status === 0 || tt.tournament?.status === 1 || tt.tournament?.status === 2
    ) ?? false;

    if (hasEnrollments) {
      this.errorMessage = `Cannot delete "${team.name}" because it is participating in one or more leagues. Remove the team from all tournaments first.`;
      this.showErrorModal = true;
      this.cdr.detectChanges();
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to permanently delete "${team.name}"?`);
    if (!confirmDelete) return;

    this.teamService.delete(team.id).subscribe({
      next: () => {
        this.allTeams = this.allTeams.filter(t => t.id !== team.id);
        this.successMessage = `Team "${team.name}" successfully deleted!`;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting team:', err);
        this.errorMessage = err.error?.message || 'Could not delete the team. It might have active enrollments.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  onPlayerClick(player: Player) {
    this.selectedPlayer = player;
    this.viewMode = 'playerDetail';
    this.cdr.detectChanges();
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedTeam = null;
    this.teamDetails = null;
    this.cdr.detectChanges();
  }

  backToTeamDetail() {
    this.viewMode = 'detail';
    this.selectedPlayer = null;
    this.cdr.detectChanges();
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.cdr.markForCheck();
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  get breadcrumbSegments(): string[] {
    if (this.viewMode === 'playerDetail' && this.selectedPlayer) {
      return ['Home', 'Teams', this.teamDetails?.name || '', `${this.selectedPlayer.firstName} ${this.selectedPlayer.lastName}`];
    }
    if (this.viewMode === 'detail' && this.teamDetails) {
      return ['Home', 'Teams', this.teamDetails.name];
    }
    return ['Home', 'Teams'];
  }

  onBreadcrumb(index: number) {
    if (index === 0) this.navigateHome.emit();
    else if (index === 1 && this.viewMode !== 'list') this.backToList();
    else if (index === 2 && this.viewMode === 'playerDetail') this.backToTeamDetail();
  }
}
