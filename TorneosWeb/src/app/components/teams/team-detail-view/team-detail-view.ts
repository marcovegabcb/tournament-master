import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../services/team.service';

@Component({
  selector: 'app-team-detail-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-detail-view.html'
})
export class TeamDetailViewComponent implements OnInit {
  @Input() team: any = null;

  @Output() back = new EventEmitter<void>();
  @Output() playerClick = new EventEmitter<any>();

  teamDetails: any = null;
  loading: boolean = false;
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
    this.cdr.detectChanges();
    this.teamService.getDetails(this.team.id).subscribe({
      next: (data) => {
        this.teamDetails = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading team details:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  togglePlayers() { this.state.players = !this.state.players; }
  toggleTournaments() { this.state.tournaments = !this.state.tournaments; }
  toggleMatches() { this.state.matches = !this.state.matches; }

  onPlayerClick(player: any) {
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
