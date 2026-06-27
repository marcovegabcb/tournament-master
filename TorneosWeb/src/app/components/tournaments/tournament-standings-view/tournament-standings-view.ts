import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../../services/match.service';
import { BracketComponent } from '../../bracket/bracket';
import { Tournament } from '../../../models/tournament';
import { Standing } from '../../../models/standing';
import { Match } from '../../../models/match';

@Component({
  selector: 'app-tournament-standings-view',
  standalone: true,
  imports: [CommonModule, BracketComponent],
  templateUrl: './tournament-standings-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentStandingsViewComponent implements OnChanges {
  @Input() tournament: Tournament | null = null;

  @Output() back = new EventEmitter<void>();

  standings: Standing[] = [];
  matches: Match[] = [];
  loading: boolean = false;

  constructor(
    private matchService: MatchService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tournament'] && !changes['tournament'].firstChange) {
      this.load();
    }
  }

  private load() {
    if (!this.tournament) return;
    this.loading = true;
    this.cdr.detectChanges();

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

  // Marcador principal: fútbol = goles (G), baloncesto = puntos (P), vóley/tenis = sets (S).
  get scoreForLabel(): string {
    const n = this.tournament?.sport?.name;
    if (n === 'Football') return 'GF';
    if (this.isSetSport) return 'SF';
    return 'PF';
  }

  get scoreAgainstLabel(): string {
    const n = this.tournament?.sport?.name;
    if (n === 'Football') return 'GA';
    if (this.isSetSport) return 'SA';
    return 'PA';
  }

  get scoreDiffLabel(): string {
    const n = this.tournament?.sport?.name;
    if (n === 'Football') return 'GD';
    if (this.isSetSport) return 'SD';
    return 'PD';
  }

  /** Vóley/tenis muestran además puntos (vóley) / juegos (tenis) a favor, en contra y diferencia. */
  get isSetSport(): boolean {
    const n = this.tournament?.sport?.name;
    return n === 'Volleyball' || n === 'Tennis';
  }

  // Columnas extra de vóley/tenis: puntos (P) en vóley, juegos (G) en tenis.
  get subForLabel(): string { return this.tournament?.sport?.name === 'Tennis' ? 'GF' : 'PF'; }
  get subAgainstLabel(): string { return this.tournament?.sport?.name === 'Tennis' ? 'GA' : 'PA'; }
  get subDiffLabel(): string { return this.tournament?.sport?.name === 'Tennis' ? 'GD' : 'PD'; }

  // Tooltips (en inglés, específicos del deporte). Marcador principal: goles/puntos/sets.
  private get mainScoreWord(): string {
    const n = this.tournament?.sport?.name;
    if (n === 'Football') return 'Goals';
    if (this.isSetSport) return 'Sets';
    return 'Points';
  }
  // Columnas extra: puntos en vóley, juegos en tenis.
  private get subScoreWord(): string {
    return this.tournament?.sport?.name === 'Tennis' ? 'Games' : 'Points';
  }

  get scoreForTitle(): string { return `${this.mainScoreWord} for`; }
  get scoreAgainstTitle(): string { return `${this.mainScoreWord} against`; }
  get scoreDiffTitle(): string { return `${this.mainScoreWord} difference`; }
  get subForTitle(): string { return `${this.subScoreWord} for`; }
  get subAgainstTitle(): string { return `${this.subScoreWord} against`; }
  get subDiffTitle(): string { return `${this.subScoreWord} difference`; }

  goBack() {
    this.back.emit();
  }

  trackByIndex(index: number): number { return index; }
}
