import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';
import { TeamService } from '../../services/team.service';
import { TournamentService } from '../../services/tournament.service';
import { Player } from '../../models/player';
import { Team } from '../../models/team';
import { Tournament } from '../../models/tournament';
import { SuccessModalComponent } from '../shared/success-modal/success-modal';
import { ErrorModalComponent } from '../shared/error-modal/error-modal';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb';
import { PlayerListViewComponent } from './player-list-view/player-list-view';
import { PlayerDetailViewComponent } from './player-detail-view/player-detail-view';
import { PlayerCreateModalComponent } from './player-create-modal/player-create-modal';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, SuccessModalComponent, ErrorModalComponent, BreadcrumbComponent, PlayerListViewComponent, PlayerDetailViewComponent, PlayerCreateModalComponent],
  templateUrl: './players.html',
  styleUrl: './players.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayersComponent implements OnInit, OnChanges {
  @Input() activeSportId: number | undefined = 0;
  @Output() navigateHome = new EventEmitter<void>();
  allPlayers: Player[] = [];
  teamsList: Team[] = [];
  tournaments: Tournament[] = [];
  loading: boolean = true;

  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  totalCount = 0;

  viewMode: 'list' | 'detail' = 'list';
  selectedPlayer: Player | null = null;

  isModalOpen: boolean = false;
  showSuccessModal: boolean = false;
  successMessage: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  constructor(
    private playerService: PlayerService,
    private teamService: TeamService,
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadTeams();
    this.loadTournaments();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeSportId'] && changes['activeSportId'].currentValue != null) {
      this.loadPlayers(1);
    }
  }

  loadPlayers(page = 1) {
    this.loading = true;
    this.playerService.getAll(undefined, page, this.pageSize, this.activeSportId || undefined).subscribe({
      next: (data) => {
        this.allPlayers = data.items;
        this.currentPage = data.page;
        this.totalPages = data.totalPages;
        this.totalCount = data.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Could not load players. Please try again.';
        this.showErrorModal = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.loadPlayers(page);
  }

  loadTeams() {
    this.teamService.getAll().subscribe({
      next: (data) => {
        this.teamsList = data.items;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Could not load teams.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  loadTournaments() {
    this.tournamentService.getAll().subscribe({
      next: (data) => {
        this.tournaments = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Could not load tournaments.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  onPlayerCreated(created: Player) {
    this.allPlayers.push(created);
    this.isModalOpen = false;
    this.successMessage = `Player "${created.firstName} ${created.lastName}" successfully registered!`;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
  }

  showDetails(player: Player) {
    this.selectedPlayer = player;
    this.viewMode = 'detail';
    this.cdr.detectChanges();
  }

  onDeletePlayer(player: Player) {
    const name = `${player.firstName} ${player.lastName}`;
    const confirmDelete = confirm(`Are you sure you want to permanently delete "${name}"?`);
    if (!confirmDelete) return;

    this.playerService.delete(player.id).subscribe({
      next: () => {
        this.allPlayers = this.allPlayers.filter(p => p.id !== player.id);
        this.successMessage = `Player "${name}" successfully deleted!`;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting player:', err);
        this.errorMessage = 'Could not delete the player.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  backToList() {
    this.viewMode = 'list';
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
    if (this.viewMode === 'detail' && this.selectedPlayer) {
      return ['Home', 'Players', `${this.selectedPlayer.firstName} ${this.selectedPlayer.lastName}`];
    }
    return ['Home', 'Players'];
  }

  onBreadcrumb(index: number) {
    if (index === 0) this.navigateHome.emit();
    else if (index === 1 && this.viewMode !== 'list') this.backToList();
  }
}
