import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { MatchService } from '../../services/match.service';
import { Tournament } from '../../models/tournament';
import { SuccessModalComponent } from '../shared/success-modal/success-modal';
import { ErrorModalComponent } from '../shared/error-modal/error-modal';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [CommonModule, SuccessModalComponent, ErrorModalComponent, BreadcrumbComponent],
  templateUrl: './generator.html',
  styleUrl: './generator.css'
})
export class GeneratorComponent {
  private _activeSportId: number | undefined = 0;

  @Input() set activeSportId(value: number | undefined) {
    this._activeSportId = value;
    this.loadTournaments();
  }

  get activeSportId(): number | undefined {
    return this._activeSportId;
  }

  @Output() navigateHome = new EventEmitter<void>();

  tournaments: Tournament[] = [];
  loading: boolean = false;
  generating: number | null = null;
  generationStep: number = 0;
  generationTimer: any = null;
  generationSteps: string[] = [
    '📋 Reading enrolled teams...',
    '🔄 Creating round 1 matchups...',
    '🔄 Creating round 2 matchups...',
    '📅 Assigning dates and venues...',
    '✅ Finalizing schedule...'
  ];

  matchesByTournament: Map<number, any[]> = new Map();
  expandedTournamentId: number | null = null;
  showSuccessModal: boolean = false;
  successMessage: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  showActionModal: boolean = false;
  actionType: 'simulate' | 'report' = 'simulate';
  selectedMatch: any = null;

  constructor(
    private tournamentService: TournamentService,
    private matchService: MatchService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  loadTournaments() {
    this.loading = true;
    this.matchesByTournament = new Map();
    this.tournamentService.getAll().subscribe({
      next: (data) => {
        let inProgress = data.filter(t => t.status === 1);
        if (this.activeSportId) {
          inProgress = inProgress.filter(t => t.sportId === this.activeSportId);
        }
        this.tournaments = inProgress;

        const withFixtures = inProgress.filter(t => t.isFixtureGenerated);
        if (withFixtures.length === 0) {
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        const checks = withFixtures.map(t =>
          this.matchService.getAll(t.id).pipe(
            map(matches => ({ id: t.id, matches })),
            catchError(() => of({ id: t.id, matches: [] as any[] }))
          )
        );

        forkJoin(checks).subscribe(results => {
          for (const r of results) {
            if (r.matches.length > 0) {
              this.matchesByTournament.set(r.id, r.matches);
            }
          }
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  generateFixture(tournamentId: number, tournamentName: string) {
    this.generating = tournamentId;
    this.generationStep = 0;
    this.cdr.detectChanges();

    this.generationTimer = setInterval(() => {
      if (this.generationStep < this.generationSteps.length - 1) {
        this.generationStep++;
        this.cdr.detectChanges();
      }
    }, 700);

    this.matchService.generateFixture(tournamentId).subscribe({
      next: () => {
        clearInterval(this.generationTimer);
        this.generationTimer = null;
        this.generationStep = this.generationSteps.length - 1;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.generating = null;
          this.successMessage = `Fixture generated for "${tournamentName}"!`;
          this.showSuccessModal = true;
          this.cdr.detectChanges();
          this.loadTournaments();
        }, 600);
      },
      error: (err) => {
        clearInterval(this.generationTimer);
        this.generationTimer = null;
        this.generating = null;
        this.errorMessage = err.error?.message || 'Could not generate fixtures.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  getMatches(tournamentId: number): any[] {
    return this.matchesByTournament.get(tournamentId) || [];
  }

  getMatchRounds(matches: any[]): string[] {
    const rounds = [...new Set(matches.map((m: any) => m.stage))];
    return rounds.sort();
  }

  getRoundLabel(stage: string): string {
    switch (stage) {
      case 'RegularSeason_Ida': return 'First Leg';
      case 'RegularSeason_Vuelta': return 'Second Leg';
      default: return stage;
    }
  }

  getMatchesByRound(matches: any[], stage: string): any[] {
    return matches.filter((m: any) => m.stage === stage);
  }

  openSimulate(match: any) {
    this.selectedMatch = match;
    this.actionType = 'simulate';
    this.showActionModal = true;
    this.cdr.detectChanges();
  }

  openReport(match: any) {
    this.selectedMatch = match;
    this.actionType = 'report';
    this.showActionModal = true;
    this.cdr.detectChanges();
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedMatch = null;
    this.cdr.detectChanges();
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  get breadcrumbSegments(): string[] {
    return ['Home', '⚙️ Matches'];
  }

  onBreadcrumb(index: number) {
    if (index === 0) this.navigateHome.emit();
  }

  toggleExpand(tournamentId: number) {
    this.expandedTournamentId = this.expandedTournamentId === tournamentId ? null : tournamentId;
    this.cdr.detectChanges();
  }
}
