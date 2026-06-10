import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { StadiumService } from '../../services/stadium.service';
import { PlayerService } from '../../services/player.service';
import { Team } from '../../models/team';
import { Player } from '../../models/player';
import { Stadium } from '../../models/stadium';
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
  styleUrl: './teams.css'
})
export class TeamsComponent implements OnInit, OnChanges {
  @Input() activeSportId: number | undefined = 0;
  @Output() navigateHome = new EventEmitter<void>();
  allTeams: Team[] = [];
  stadiumsList: Stadium[] = [];
  playersList: Player[] = [];
  loading: boolean = true;

  viewMode: 'list' | 'detail' | 'playerDetail' = 'list';
  selectedTeam: Team | null = null;
  teamDetails: any = null;
  selectedPlayer: any = null;

  isModalOpen: boolean = false;
  showSuccessModal: boolean = false;
  successMessage: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  constructor(
    private teamService: TeamService,
    private stadiumService: StadiumService,
    private playerService: PlayerService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadTeams();
    this.loadStadiums();
    this.loadPlayers();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeSportId'] && !changes['activeSportId'].firstChange) {
      this.cdr.detectChanges();
    }
  }

  loadTeams() {
    this.loading = true;
    this.teamService.getAll().subscribe({
      next: (data) => {
        this.allTeams = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading teams:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadStadiums() {
    this.stadiumService.getAll().subscribe({
      next: (data) => {
        this.stadiumsList = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading stadiums:', err)
    });
  }

  loadPlayers() {
    this.playerService.getAll().subscribe({
      next: (data) => {
        this.playersList = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading players:', err)
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  onTeamCreated(created: any) {
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
        console.error('Error loading team details:', err);
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

  onPlayerClick(player: any) {
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
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
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
