import { Component, Input, Output, EventEmitter, ChangeDetectorRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../../services/player.service';
import { Player } from '../../../models/player';
import { PlayerStats } from '../../../models/player-stats';

@Component({
  selector: 'app-player-detail-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-detail-view.html'
})
export class PlayerDetailViewComponent implements OnInit, OnChanges {
  @Input() player: Player | null = null;
  @Input() tournamentId?: number;

  @Output() back = new EventEmitter<void>();

  stats: PlayerStats | null = null;
  loadingStats: boolean = false;

  constructor(private playerService: PlayerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadStats();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['player'] && !changes['player'].firstChange) {
      this.loadStats();
    }
  }

  private loadStats() {
    if (!this.player?.id) return;
    this.loadingStats = true;
    this.stats = null;
    this.cdr.detectChanges();
    this.playerService.getStats(this.player.id, this.tournamentId).subscribe({
      next: (data) => {
        this.stats = data;
        this.loadingStats = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingStats = false;
        this.cdr.detectChanges();
      }
    });
  }

  getInitials(first: string, last: string): string {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
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

  statLabel(key: string): string {
    const map: Record<string, string> = {
      goals: 'Goals',
      assists: 'Assists',
      yellowCards: 'Yellow Cards',
      redCards: 'Red Cards',
      points: 'Points',
      rebounds: 'Rebounds',
      aces: 'Aces',
      doubleFaults: 'Double Faults',
      winners: 'Winners',
      kills: 'Kills',
      blocks: 'Blocks',
    };
    return map[key] || key;
  }

  statKeys(): string[] {
    return this.stats?.stats ? Object.keys(this.stats.stats) : [];
  }

  goBack() {
    this.back.emit();
  }
}
