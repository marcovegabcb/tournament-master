import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../../services/match.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tournament-schedule-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tournament-schedule-view.html'
})
export class TournamentScheduleViewComponent {
  @Input() tournament: any = null;

  @Output() back = new EventEmitter<void>();
  @Output() fixtureGenerated = new EventEmitter<void>();

  matches: any[] = [];
  matchRounds: string[] = [];
  matchesByRound: { [key: string]: any[] } = {};
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
  private generationTimer: any = null;
  private loadTimeout: any = null;

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
        const order = ['Ronda preliminar', 'Octavos de final', 'Cuartos de final', 'Semifinal', 'Semifinales', 'Final', 'Tercer lugar'];
        const normalize = (s: string) => s.replace(/ - (Ida|Vuelta)$/, '').trim();
        const rank = (s: string) => { const i = order.indexOf(normalize(s)); return i >= 0 ? i : 999; };
        const leg = (s: string) => s.endsWith('Ida') ? 0 : s.endsWith('Vuelta') ? 1 : 0;
        const rounds = [...new Set(data.map((m: any) => m.stage))].sort((a, b) => {
          const d = rank(a) - rank(b);
          return d !== 0 ? d : leg(a) - leg(b);
        });
        this.matchRounds = rounds;
        const grouped: { [key: string]: any[] } = {};
        for (const r of rounds) {
          grouped[r] = data.filter((m: any) => m.stage === r);
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
}
