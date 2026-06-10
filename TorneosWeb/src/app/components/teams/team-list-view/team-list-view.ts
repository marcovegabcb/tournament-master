import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Team } from '../../../models/team';
import { Stadium } from '../../../models/stadium';

@Component({
  selector: 'app-team-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-list-view.html'
})
export class TeamListViewComponent {
  @Input() set teams(value: Team[]) {
    this._allTeams = value;
    this.applyFilters();
  }
  @Input() set activeSportId(value: number | undefined) {
    this._activeSportId = value;
    this.applyFilters();
  }
  get activeSportId(): number | undefined { return this._activeSportId; }
  private _activeSportId: number | undefined = 0;
  @Input() loading: boolean = false;
  @Input() stadiumsList: Stadium[] = [];

  @Output() createTeam = new EventEmitter<void>();
  @Output() showDetails = new EventEmitter<Team>();
  @Output() deleteTeam = new EventEmitter<Team>();
  @Output() navigateHome = new EventEmitter<void>();

  _allTeams: Team[] = [];
  teamsList: Team[] = [];

  openDropdown: string | null = null;
  filterBy: string = 'all';
  sortBy: string = 'nameAsc';
  searchQuery: string = '';

  filterOptions = [
    { label: '🛡️ All Teams', value: 'all' },
    { label: '🏟️ Has Stadium', value: 'hasStadium' },
    { label: '🏟️ No Stadium', value: 'noStadium' }
  ];

  sortOptions = [
    { label: '📛 Name (A-Z)', value: 'nameAsc' },
    { label: '📛 Name (Z-A)', value: 'nameDesc' },
    { label: '⭐ Prestige (High-Low)', value: 'prestigeDesc' },
    { label: '⭐ Prestige (Low-High)', value: 'prestigeAsc' }
  ];

  get filterLabel(): string {
    return this.filterOptions.find(o => o.value === this.filterBy)?.label || '🛡️ All Teams';
  }

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

  setFilter(value: string) {
    this.filterBy = value;
    this.openDropdown = null;
    this.applyFilters();
  }

  setSort(value: string) {
    this.sortBy = value;
    this.openDropdown = null;
    this.applyFilters();
  }

  private sortTeams(list: Team[]): Team[] {
    switch (this.sortBy) {
      case 'nameDesc': return [...list].sort((a, b) => b.name.localeCompare(a.name));
      case 'prestigeDesc': return [...list].sort((a, b) => b.prestigePoints - a.prestigePoints);
      case 'prestigeAsc': return [...list].sort((a, b) => a.prestigePoints - b.prestigePoints);
      default: return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  applyFilters() {
    let result = this._allTeams;
    if (this.activeSportId) {
      result = result.filter(t => t.sportId === this.activeSportId);
    }
    if (this.filterBy === 'hasStadium') {
      result = result.filter(t => !!t.stadiumId);
    } else if (this.filterBy === 'noStadium') {
      result = result.filter(t => !t.stadiumId);
    }
    this.teamsList = this.sortTeams(result);
  }

  get searchedTeams(): Team[] {
    if (!this.searchQuery) return this.teamsList;
    const q = this.searchQuery.toLowerCase();
    return this.teamsList.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.captainName?.toLowerCase().includes(q) ||
      t.sport?.name?.toLowerCase().includes(q)
    );
  }

  getInitials(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  getStadiumName(stadiumId: number | undefined | null): string {
    if (!stadiumId) return '—';
    const stadium = this.stadiumsList.find(s => s.id === stadiumId);
    return stadium ? `${stadium.name} (${stadium.city})` : '—';
  }

  hasActiveEnrollments(team: Team): boolean {
    return team.teamTournaments?.some(tt =>
      tt.tournament?.status === 0 ||
      tt.tournament?.status === 1 ||
      tt.tournament?.status === 2
    ) ?? false;
  }

  onDelete(team: Team) {
    this.deleteTeam.emit(team);
  }

  onShowDetails(team: Team) {
    this.showDetails.emit(team);
  }
}
