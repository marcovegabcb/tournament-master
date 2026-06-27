import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Player } from '../../../models/player';
import { Team } from '../../../models/team';
import { Tournament } from '../../../models/tournament';

@Component({
  selector: 'app-player-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-list-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerListViewComponent {
  @Input() set players(value: Player[]) {
    this._allPlayers = value;
  }
  @Input() activeSportId: number | undefined = 0;
  @Input() loading: boolean = false;
  @Input() teamsList: Team[] = [];
  @Input() tournaments: Tournament[] = [];

  @Input() currentPage = 1;
  @Input() totalPages = 0;
  @Input() totalCount = 0;

  @Output() createPlayer = new EventEmitter<void>();
  @Output() showDetails = new EventEmitter<Player>();
  @Output() deletePlayer = new EventEmitter<Player>();
  @Output() navigateHome = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();

  _allPlayers: Player[] = [];

  selectedTournamentId: number | null = null;
  selectedTeamId: number | null = null;
  tournamentTeams: Team[] = [];

  openDropdown: string | null = null;
  sortBy: string = 'nameAsc';
  searchQuery: string = '';

  sortOptions = [
    { label: '📛 Name (A-Z)', value: 'nameAsc' },
    { label: '📛 Name (Z-A)', value: 'nameDesc' },
    { label: '🔢 Jersey (Low-High)', value: 'jerseyAsc' },
    { label: '🔢 Jersey (High-Low)', value: 'jerseyDesc' },
    { label: '🛡️ Team (A-Z)', value: 'teamAsc' },
    { label: '🛡️ Team (Z-A)', value: 'teamDesc' }
  ];

  get sortLabel(): string {
    return this.sortOptions.find(o => o.value === this.sortBy)?.label || '📛 Name (A-Z)';
  }

  constructor(
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  toggleDropdown(name: string, event: Event) {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === name ? null : name;
  }

  setSort(value: string) {
    this.sortBy = value;
    this.openDropdown = null;
  }

  get tournamentLabel(): string {
    if (!this.selectedTournamentId) return '🏆 All Tournaments';
    const t = this.tournaments.find(t => t.id === this.selectedTournamentId);
    return t ? `🏆 ${t.name}` : '🏆 All Tournaments';
  }

  get teamLabel(): string {
    if (!this.selectedTeamId) return '👥 All Teams';
    const team = this.teamsList.find(t => t.id === this.selectedTeamId);
    return team ? `🛡️ ${team.name}` : '👥 All Teams';
  }

  setTournamentFilter(value: number | null) {
    this.selectedTournamentId = value;
    this.selectedTeamId = null;
    this.tournamentTeams = [];
    this.openDropdown = null;
    if (value) {
      const tournament = this.tournaments.find(t => t.id === value);
      if (tournament?.teamTournaments) {
        this.tournamentTeams = tournament.teamTournaments
          .map(tt => tt.team)
          .filter((t): t is Team => t != null);
      }
    }
  }

  setTeamFilter(value: number | null) {
    this.selectedTeamId = value;
    this.openDropdown = null;
  }

  getFilteredTournaments(): Tournament[] {
    if (!this.activeSportId) return this.tournaments;
    return this.tournaments.filter(t => t.sportId === this.activeSportId);
  }

  get filteredPlayers(): Player[] {
    let result = this._allPlayers;

    if (this.activeSportId) {
      result = result.filter(p =>
        !p.teamId ||
        p.team?.sportId === this.activeSportId ||
        p.team?.sport?.id === this.activeSportId
      );
    }

    if (this.selectedTournamentId) {
      const teamIds = new Set(this.tournamentTeams.map(t => t.id));
      result = result.filter(p => !p.teamId || teamIds.has(p.teamId));
    }

    if (this.selectedTeamId) {
      result = result.filter(p => p.teamId === this.selectedTeamId);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.team?.name?.toLowerCase().includes(q)
      );
    }

    switch (this.sortBy) {
      case 'nameDesc': return [...result].sort((a, b) => (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName)).reverse();
      case 'jerseyAsc': return [...result].sort((a, b) => a.jerseyNumber - b.jerseyNumber);
      case 'jerseyDesc': return [...result].sort((a, b) => b.jerseyNumber - a.jerseyNumber);
      case 'teamAsc': return [...result].sort((a, b) => (a.team?.name || '').localeCompare(b.team?.name || ''));
      case 'teamDesc': return [...result].sort((a, b) => (b.team?.name || '').localeCompare(a.team?.name || ''));
      default: return [...result].sort((a, b) => (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName));
    }
  }

  getSportColor(sportId: number | undefined): string {
    switch (sportId) {
      case 1: return '#22c55e';
      case 2: return '#f97316';
      case 3: return '#38bdf8';
      case 4: return '#a855f7';
      default: return '#10b981';
    }
  }

  getInitials(first: string, last: string): string {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  }

  onShowDetails(player: Player) {
    this.showDetails.emit(player);
  }

  onDelete(player: Player) {
    this.deletePlayer.emit(player);
  }

  trackByPlayerId(index: number, p: Player): number { return p.id; }
  trackByTeamId(index: number, t: Team): number { return t.id; }
  trackByTournamentId(index: number, t: Tournament): number { return t.id; }
  trackByIndex(index: number): number { return index; }
}
