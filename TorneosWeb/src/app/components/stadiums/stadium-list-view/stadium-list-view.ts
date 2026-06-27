import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Stadium } from '../../../models/stadium';

@Component({
  selector: 'app-stadium-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stadium-list-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StadiumListViewComponent {
  @Input() set stadiums(value: Stadium[]) {
    this._allStadiums = value;
    this.applyFilters();
  }
  @Input() set activeSportId(value: number | undefined) {
    this._activeSportId = value;
    this.applyFilters();
  }
  get activeSportId(): number | undefined { return this._activeSportId; }
  private _activeSportId: number | undefined = 0;
  @Input() loading: boolean = false;

  @Input() currentPage = 1;
  @Input() totalPages = 0;
  @Input() totalCount = 0;

  @Output() createStadium = new EventEmitter<void>();
  @Output() showDetails = new EventEmitter<Stadium>();
  @Output() deleteStadium = new EventEmitter<Stadium>();
  @Output() pageChange = new EventEmitter<number>();

  _allStadiums: Stadium[] = [];
  filteredStadiums: Stadium[] = [];

  openDropdown: string | null = null;
  sortBy: string = 'default';
  venueFilter: string = 'all';
  searchQuery: string = '';

  filterOptions = [
    { label: '🏟️ All Venues', value: 'all' },
    { label: '🏠 Team Venue', value: 'team' },
    { label: '🏟️ Neutral Venue', value: 'neutral' }
  ];

  sortOptions = [
    { label: '📋 Default', value: 'default' },
    { label: '📊 By Capacity', value: 'capacity' },
    { label: '📐 By Dimensions', value: 'dimensions' }
  ];

  get filterLabel(): string {
    return this.filterOptions.find(o => o.value === this.venueFilter)?.label || '🏟️ All Venues';
  }

  get sortLabel(): string {
    return this.sortOptions.find(o => o.value === this.sortBy)?.label || '📋 Default';
  }

  constructor(
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  toggleDropdown(name: string, event: Event) {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === name ? null : name;
  }

  setVenueFilter(filter: string) {
    this.venueFilter = filter;
    this.openDropdown = null;
    this.applyFilters();
  }

  setSort(sort: string) {
    this.sortBy = sort;
    this.openDropdown = null;
    this.applyFilters();
  }

  applyFilters() {
    let result = this._allStadiums;
    if (this.activeSportId) {
      result = result.filter(s => s.sportId === this.activeSportId);
    }
    if (this.venueFilter === 'team') {
      result = result.filter(s => (s.teams?.length ?? 0) > 0);
    } else if (this.venueFilter === 'neutral') {
      result = result.filter(s => (s.teams?.length ?? 0) === 0);
    }
    if (this.sortBy === 'capacity') {
      result = [...result].sort((a, b) => b.capacity - a.capacity);
    } else if (this.sortBy === 'dimensions') {
      result = [...result].sort((a, b) => (b.length * b.width) - (a.length * a.width));
    }
    this.filteredStadiums = result;
  }

  get searchedStadiums(): Stadium[] {
    if (!this.searchQuery) return this.filteredStadiums;
    const q = this.searchQuery.toLowerCase();
    return this.filteredStadiums.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.sport?.name?.toLowerCase().includes(q)
    );
  }

  getSportColor(sportId: number | undefined): string {
    switch (sportId) {
      case 1: return 'text-green-400';
      case 2: return 'text-orange-400';
      case 3: return 'text-sky-400';
      case 4: return 'text-purple-400';
      default: return 'text-indigo-400';
    }
  }

  onDelete(stadium: Stadium) {
    this.deleteStadium.emit(stadium);
  }

  onShowDetails(stadium: Stadium) {
    this.showDetails.emit(stadium);
  }

  trackByStadiumId(index: number, s: Stadium): number { return s.id; }
  trackByIndex(index: number): number { return index; }
}
