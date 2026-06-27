import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Tournament } from '../../../models/tournament';
import { Sport } from '../../../models/sport';

@Component({
  selector: 'app-tournament-list-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tournament-list-view.html',
  styleUrl: './tournament-list-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentListViewComponent {
  @Input() list: Tournament[] = [];
  @Input() sportsList: Sport[] = [];

  @Output() showSchedule = new EventEmitter<Tournament>();
  @Output() showStandings = new EventEmitter<Tournament>();
  @Output() deleteTournament = new EventEmitter<{ id: number; name: string }>();
  @Output() closeRegistration = new EventEmitter<Tournament>();
  @Output() openEnrollment = new EventEmitter<Tournament>();
  @Output() goToGenerator = new EventEmitter<number>();
  @Output() viewTeams = new EventEmitter<Tournament>();
  @Output() navigateHome = new EventEmitter<void>();
  @Output() tournamentCreated = new EventEmitter<void>();

  pageSize = 6;
  openPage = 0;
  progressPage = 0;
  openCollapsed = false;
  progressCollapsed = false;
  finishedCollapsed = false;

  openDropdown: string | null = null;
  statusFilter: number | null = null;
  sortBy: string = 'nameAsc';

  filterOptions = [
    { label: '🏆 All Tournaments', value: null },
    { label: '🟢 Registration Open', value: 0 },
    { label: '🔵 In Progress', value: 1 },
    { label: '⚫ Finished', value: 2 }
  ];

  sortOptions = [
    { label: '📛 Name (A-Z)', value: 'nameAsc' },
    { label: '📛 Name (Z-A)', value: 'nameDesc' },
    { label: '🆕 Newest First', value: 'newest' },
    { label: '🕐 Oldest First', value: 'oldest' }
  ];

  constructor(
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get filterLabel(): string {
    return this.filterOptions.find(o => o.value === this.statusFilter)?.label || '🏆 All Tournaments';
  }

  get sortLabel(): string {
    return this.sortOptions.find(o => o.value === this.sortBy)?.label || '📛 Name (A-Z)';
  }

  toggleDropdown(name: string, event: Event) {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === name ? null : name;
  }

  setFilter(value: number | null) {
    this.statusFilter = value;
    this.openDropdown = null;
    this.openPage = 0;
    this.progressPage = 0;
  }

  setSort(value: string) {
    this.sortBy = value;
    this.openDropdown = null;
  }

  private sortTournaments(list: Tournament[]): Tournament[] {
    switch (this.sortBy) {
      case 'nameDesc': return [...list].sort((a, b) => b.name.localeCompare(a.name));
      case 'newest': return [...list].sort((a, b) => b.id - a.id);
      case 'oldest': return [...list].sort((a, b) => a.id - b.id);
      default: return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  get openPages(): number {
    return Math.max(1, Math.ceil(this.sortTournaments(this.getOpen()).length / this.pageSize));
  }

  get progressPages(): number {
    return Math.max(1, Math.ceil(this.sortTournaments(this.getProgress()).length / this.pageSize));
  }

  get pagedOpen(): Tournament[] {
    const start = this.openPage * this.pageSize;
    return this.sortTournaments(this.getOpen()).slice(start, start + this.pageSize);
  }

  get pagedProgress(): Tournament[] {
    const start = this.progressPage * this.pageSize;
    return this.sortTournaments(this.getProgress()).slice(start, start + this.pageSize);
  }

  getOpen(): Tournament[] {
    return this.list.filter(t => t.status === 0);
  }

  getProgress(): Tournament[] {
    return this.list.filter(t => t.status === 1);
  }

  getFinished(): Tournament[] {
    return this.list.filter(t => t.status === 2);
  }

  getStatusLabel(status: number): string {
    switch (status) {
      case 0: return 'Registration Open';
      case 1: return 'In Progress';
      case 2: return 'Finished';
      default: return 'Unknown';
    }
  }

  getStatusColor(status: number): string {
    switch (status) {
      case 0: return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 1: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 2: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  getStatusDot(status: number): string {
    switch (status) {
      case 0: return 'bg-green-400';
      case 1: return 'bg-blue-400';
      case 2: return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  }

  getEnrolledCount(tournament: Tournament): number {
    return tournament._enrolledCount ?? tournament.teamTournaments?.length ?? 0;
  }

  onShowSchedule(tournament: Tournament) {
    this.showSchedule.emit(tournament);
  }

  onShowStandings(tournament: Tournament) {
    this.showStandings.emit(tournament);
  }

  onDelete(tournament: Tournament) {
    const ok = confirm(`Are you sure you want to permanently delete the tournament "${tournament.name}"?`);
    if (!ok) return;
    this.deleteTournament.emit({ id: tournament.id, name: tournament.name });
  }

  onCloseRegistration(tournament: Tournament) {
    const ok = confirm(`Close registration for "${tournament.name}"? This will start the tournament.`);
    if (!ok) return;
    this.closeRegistration.emit(tournament);
  }

  onViewTeams(tournament: Tournament) {
    this.viewTeams.emit(tournament);
  }

  onOpenEnrollment(tournament: Tournament) {
    this.openEnrollment.emit(tournament);
  }

  onGoToGenerator(id: number) {
    this.goToGenerator.emit(id);
  }

  goHome() {
    this.navigateHome.emit();
  }

  trackByTournamentId(index: number, t: Tournament): number { return t.id; }
  trackByIndex(index: number): number { return index; }
}
