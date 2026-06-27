import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../../services/match.service';
import { AuthService } from '../../../services/auth.service';
import { Tournament } from '../../../models/tournament';
import { Match } from '../../../models/match';

@Component({
  selector: 'app-tournament-schedule-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tournament-schedule-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentScheduleViewComponent {
  @Input() tournament: Tournament | null = null;

  @Output() back = new EventEmitter<void>();
  @Output() fixtureGenerated = new EventEmitter<void>();

  matches: Match[] = [];
  matchRounds: string[] = [];
  matchesByRound: { [key: string]: Match[] } = {};
  loading: boolean = false;
  loadError: string = '';
  generating: boolean = false;
  generationStep: number = 0;
  generationSteps: string[] = [
    '📋 Reading enrolled teams...',
    '🔄 Creating round 1 matchups...',
    '🔄 Creating round 2 matchups...',
    '📅 Assigning dates and venues...',
    '✅ Finalizing schedule...'
  ];
  private generationTimer: ReturnType<typeof setInterval> | null = null;
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private matchService: MatchService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadMatches();
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  private loadMatches() {
    if (!this.tournament) return;
    this.loading = true;
    this.loadError = '';
    this.cdr.detectChanges();

    this.loadTimeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.loadError = 'Request timed out. Make sure the backend is running (dotnet run in Torneos.API).';
        this.cdr.detectChanges();
      }
    }, 10000);

    this.matchService.getAll(this.tournament.id).subscribe({
      next: (data) => {
        this.clearTimeout();
        this.matches = data;
        this.propagateByes();
        const order = ['Ronda preliminar', 'Octavos de final', 'Cuartos de final', 'Semifinal', 'Semifinales', 'Final', 'Tercer lugar'];
        const normalize = (s: string) => s.replace(/ - (Ida|Vuelta)$/, '').trim();
        const rank = (s: string) => { const i = order.indexOf(normalize(s)); return i >= 0 ? i : 999; };
        const leg = (s: string) => s.endsWith('Ida') ? 0 : s.endsWith('Vuelta') ? 1 : 0;
        const rounds = [...new Set(this.matches.map(m => m.stage))].sort((a, b) => {
          const d = rank(a) - rank(b);
          return d !== 0 ? d : leg(a) - leg(b);
        });
        this.matchRounds = rounds;
        const grouped: { [key: string]: Match[] } = {};
        for (const r of rounds) {
          grouped[r] = this.matches.filter(m => m.stage === r);
        }
        this.matchesByRound = grouped;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.clearTimeout();
        console.error('Error loading matches:', err);
        this.loading = false;
        this.loadError = 'Could not load matches. Check the backend console.';
        this.cdr.detectChanges();
      }
    });
  }

  generateFixture() {
    if (!this.tournament) return;
    this.generating = true;
    this.generationStep = 0;

    this.generationTimer = setInterval(() => {
      if (this.generationStep < this.generationSteps.length - 1) {
        this.generationStep++;
        this.cdr.detectChanges();
      }
    }, 800);

    this.matchService.generateFixture(this.tournament.id).subscribe({
      next: () => {
        this.clearInterval();
        this.generationStep = this.generationSteps.length - 1;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.generating = false;
          this.fixtureGenerated.emit();
          this.loadMatches();
        }, 600);
      },
      error: (err) => {
        this.clearInterval();
        this.generating = false;
        this.loadError = err.error?.message || 'Could not generate fixtures.';
        this.cdr.detectChanges();
      }
    });
  }

  private clearTimeout() {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
  }

  private clearInterval() {
    if (this.generationTimer) {
      clearInterval(this.generationTimer);
      this.generationTimer = null;
    }
  }

  private clearTimers() {
    this.clearTimeout();
    this.clearInterval();
  }

  private propagateByes(): void {
    const nextMap: Record<string, string> = {
      'Ronda preliminar': 'Octavos de final',
      'Octavos de final': 'Cuartos de final',
      'Cuartos de final': 'Semifinales',
      'Semifinal': 'Final',
      'Semifinales': 'Final',
    };
    for (const curStage of Object.keys(nextMap)) {
      const cur = this.matches.filter(m => m.stage === curStage).sort((a, b) => a.id - b.id);
      const nxt = this.matches.filter(m => m.stage === nextMap[curStage]).sort((a, b) => a.id - b.id);
      if (!cur.length || !nxt.length) continue;
      for (let i = 0; i < cur.length; i++) {
        const cm = cur[i];
        if (!cm.homeTeam || cm.awayTeam) continue;
        cm._bye = true;
        const nextIdx = Math.floor(i / 2);
        if (nextIdx >= nxt.length) continue;
        const nm = nxt[nextIdx];
        if (i % 2 === 0) { if (!nm.homeTeam) nm.homeTeam = cm.homeTeam; }
        else { if (!nm.awayTeam) nm.awayTeam = cm.homeTeam; }
      }
    }
    this.matches = this.matches.filter(m => !m._bye);
  }

  translateStage(s: string): string {
    const map: Record<string, string> = {
      'Ronda preliminar': 'Preliminary Round',
      'Octavos de final': 'Round of 16',
      'Cuartos de final': 'Quarterfinals',
      'Semifinal': 'Semifinal',
      'Semifinales': 'Semifinals',
      'Final': 'Final',
      'Tercer lugar': 'Third Place'
    };
    const base = s.replace(/ - (Ida|Vuelta)$/, '').trim();
    const suffix = s.endsWith(' - Ida') ? ' - 1st Leg' : s.endsWith(' - Vuelta') ? ' - 2nd Leg' : '';
    return (map[base] || base) + suffix;
  }

  goBack() {
    this.clearTimers();
    this.back.emit();
  }

  trackByIndex(index: number): number { return index; }
  trackByStage(index: number, s: string): string { return s; }
  trackByMatchId(index: number, m: Match): number { return m.id || index; }
}
