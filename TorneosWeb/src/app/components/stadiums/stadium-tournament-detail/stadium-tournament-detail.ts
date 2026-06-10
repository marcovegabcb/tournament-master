import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stadium-tournament-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stadium-tournament-detail.html'
})
export class StadiumTournamentDetailComponent {
  @Input() tournament: any = null;

  @Output() back = new EventEmitter<void>();

  goBack() {
    this.back.emit();
  }
}
