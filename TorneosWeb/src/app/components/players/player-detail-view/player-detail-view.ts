import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../../../services/player.service';
import { Team } from '../../../models/team';

@Component({
  selector: 'app-player-detail-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-detail-view.html'
})
export class PlayerDetailViewComponent {
  @Input() player: any = null;

  @Output() back = new EventEmitter<void>();

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

  goBack() {
    this.back.emit();
  }
}
