import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../services/team.service';
import { Team } from '../../../models/team';
import { TeamDetail } from '../../../models/team-detail';
import { Player } from '../../../models/player';

@Component({
  selector: 'app-team-detail-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-detail-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamDetailViewComponent implements OnInit {
  @Input() team: Team | null = null;

  @Output() back = new EventEmitter<void>();
  @Output() playerClick = new EventEmitter<Player>();

  teamDetails: TeamDetail | null = null;
  loading: boolean = false;
  errorMessage: string = '';
  state = { players: false, tournaments: false, matches: false };

  constructor(
    private teamService: TeamService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    if (!this.team) return;
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    this.teamService.getDetails(this.team.id).subscribe({
      next: (data) => {
        this.teamDetails = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || err.error?.message || err.message || `HTTP ${err.status}: Could not load team details.`;
        if (err.error && typeof err.error === 'object') {
          const extra = JSON.stringify(err.error);
          if (extra !== '{}') this.errorMessage += ` (${extra})`;
        }
        console.error('Error loading team details:', this.errorMessage);
        console.error('Status:', err.status, 'Body:', JSON.stringify(err.error));
        this.cdr.detectChanges();
      }
    });
  }

  togglePlayers() { this.state.players = !this.state.players; this.cdr.detectChanges(); }
  toggleTournaments() { this.state.tournaments = !this.state.tournaments; this.cdr.detectChanges(); }
  toggleMatches() { this.state.matches = !this.state.matches; this.cdr.detectChanges(); }

  onPlayerClick(player: Player) {
    this.playerClick.emit(player);
  }

  goBack() {
    this.back.emit();
  }

  getInitials(name: string): string {
    return name.charAt(0).toUpperCase();
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
}
