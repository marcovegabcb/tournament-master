import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../../services/player.service';

@Component({
  selector: 'app-team-player-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-player-detail.html'
})
export class TeamPlayerDetailComponent implements OnInit {
  @Input() player: any = null;
  @Input() teamName: string = '';

  @Output() back = new EventEmitter<void>();

  playerDetails: any = null;
  loading: boolean = false;

  constructor(
    private playerService: PlayerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.player) {
      this.loadDetails();
    }
  }

  private loadDetails() {
    this.loading = true;
    this.cdr.detectChanges();
    this.playerService.getDetails(this.player.id).subscribe({
      next: (data) => {
        this.playerDetails = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading player details:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack() {
    this.back.emit();
  }

  getInitials(first: string, last: string): string {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  }
}
