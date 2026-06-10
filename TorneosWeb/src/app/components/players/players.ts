import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
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
  styleUrl: './players.css'
})
export class PlayersComponent implements OnInit {
  @Input() activeSportId: number | undefined = 0;
  @Output() navigateHome = new EventEmitter<void>();
  allPlayers: Player[] = [];
  teamsList: Team[] = [];
  tournaments: Tournament[] = [];
  loading: boolean = true;

  viewMode: 'list' | 'detail' = 'list';
  selectedPlayer: Player | null = null;
  playerDetails: any = null;

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
    this.loadPlayers();
    this.loadTeams();
    this.loadTournaments();
  }

  loadPlayers() {
    this.loading = true;
    this.playerService.getAll().subscribe({
      next: (data) => {
        this.allPlayers = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading players:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTeams() {
    this.teamService.getAll().subscribe({
      next: (data) => {
        this.teamsList = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading teams:', err)
    });
  }

  loadTournaments() {
    this.tournamentService.getAll().subscribe({
      next: (data) => {
        this.tournaments = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading tournaments:', err)
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  onPlayerCreated(created: any) {
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
    this.playerDetails = null;
    this.viewMode = 'detail';
    this.cdr.detectChanges();

    this.playerService.getDetails(player.id).subscribe({
      next: (data) => {
        this.playerDetails = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading player details:', err);
        this.cdr.detectChanges();
      }
    });
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
    this.playerDetails = null;
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
    if (this.viewMode === 'detail' && this.playerDetails) {
      return ['Home', 'Players', `${this.playerDetails.firstName} ${this.playerDetails.lastName}`];
    }
    return ['Home', 'Players'];
  }

  onBreadcrumb(index: number) {
    if (index === 0) this.navigateHome.emit();
    else if (index === 1 && this.viewMode !== 'list') this.backToList();
  }
}
