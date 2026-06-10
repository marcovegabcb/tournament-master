import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../../services/match.service';
import { BracketComponent } from '../../bracket/bracket';

@Component({
  selector: 'app-tournament-standings-view',
  standalone: true,
  imports: [CommonModule, BracketComponent],
  templateUrl: './tournament-standings-view.html'
})
export class TournamentStandingsViewComponent {
  @Input() tournament: any = null;

  @Output() back = new EventEmitter<void>();

  standings: any[] = [];
  matches: any[] = [];
  loading: boolean = false;

  constructor(
    private matchService: MatchService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    if (!this.tournament) return;
    this.loading = true;
    this.cdr.detectChanges();

    // For knockout, load matches for bracket display
    if (this.tournament.format === 1) {
      this.matchService.getAll(this.tournament.id).subscribe({
        next: (data) => {
          this.matches = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading matches:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.matchService.getStandings(this.tournament.id).subscribe({
        next: (data) => {
          this.standings = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading standings:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  goBack() {
    this.back.emit();
  }
}
