import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { Match } from '../../models/match';
import { map, catchError } from 'rxjs/operators';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { MatchService } from '../../services/match.service';
import { PlayerService } from '../../services/player.service';
import { Tournament, TournamentFormat } from '../../models/tournament';
import { SuccessModalComponent } from '../shared/success-modal/success-modal';
import { ErrorModalComponent } from '../shared/error-modal/error-modal';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb';
import { getSportConfig, type SportConfig, type StatField } from '../../sports';
import { getSimulator, randInt } from '../../simulation';

interface PlayerFormEntry {
  playerId: number;
  jerseyNumber: number;
  name: string;
  stats: Record<string, number>;
}

@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, SuccessModalComponent, ErrorModalComponent, BreadcrumbComponent],
  templateUrl: './generator.html',
  styleUrl: './generator.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneratorComponent implements OnDestroy {
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
  generationTimer: ReturnType<typeof setInterval> | null = null;
  generationSteps: string[] = [
    '📋 Reading enrolled teams...',
    '🔄 Creating round 1 matchups...',
    '🔄 Creating round 2 matchups...',
    '📅 Assigning dates and venues...',
    '✅ Finalizing schedule...'
  ];

  matchesByTournament: Map<number, Match[]> = new Map();
  expandedTournamentId: number | null = null;
  showSuccessModal: boolean = false;
  successMessage: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  showActionModal: boolean = false;
  actionType: 'simulate' | 'report' = 'simulate';
  // La simulación reutiliza el formulario de reporte; esta bandera solo cambia el aviso/título.
  isSimulated: boolean = false;
  selectedMatch: Match | null = null;

  formHomeScore: number = 0;
  formAwayScore: number = 0;
  formHomeSets: number[] = [];
  formAwaySets: number[] = [];
  formHomeTiebreak: number | null = null;
  formAwayTiebreak: number | null = null;
  submittingReport: boolean = false;

  sportName: string = '';
  sportConfig: SportConfig | null = null;
  statFields: StatField[] = [];
  formHomePlayers: PlayerFormEntry[] = [];
  formAwayPlayers: PlayerFormEntry[] = [];
  loadingPlayers: boolean = false;
  saveError: string = '';

  constructor(
    private tournamentService: TournamentService,
    private matchService: MatchService,
    private playerService: PlayerService,
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
            catchError(() => of({ id: t.id, matches: [] as Match[] }))
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
        clearInterval(this.generationTimer!);
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
        clearInterval(this.generationTimer!);
        this.generationTimer = null;
        this.generating = null;
        this.errorMessage = err.error?.error || err.error?.message || 'Could not generate fixtures.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  getMatches(tournamentId: number): Match[] {
    return this.matchesByTournament.get(tournamentId) || [];
  }

  getMatchRounds(matches: Match[]): string[] {
    // Orden de eliminatoria (de primera a última ronda). Para liga se usa el número de jornada.
    const order = [
      'Ronda de 64', 'Ronda de 32', 'Ronda preliminar', 'Octavos de final',
      'Cuartos de final', 'Semifinal', 'Semifinales', 'Final', 'Tercer lugar'
    ];
    const normalize = (s: string) => s.replace(/ - (Ida|Vuelta)$/, '').trim();
    const leg = (s: string) => (s.endsWith('Vuelta') ? 1 : 0);
    const rank = (s: string) => {
      const jornada = /^Jornada (\d+)$/.exec(s);
      if (jornada) return parseInt(jornada[1], 10); // liga: orden numérico real (Jornada 2 antes que 10)
      const i = order.indexOf(normalize(s));
      return i >= 0 ? i : 999;
    };
    return [...new Set(matches.map(m => m.stage))].sort((a, b) => {
      const d = rank(a) - rank(b);
      return d !== 0 ? d : leg(a) - leg(b);
    });
  }

  getRoundLabel(stage: string): string {
    const map: Record<string, string> = {
      'Ronda de 64': 'Round of 64',
      'Ronda de 32': 'Round of 32',
      'Ronda preliminar': 'Preliminary Round',
      'Octavos de final': 'Round of 16',
      'Cuartos de final': 'Quarterfinals',
      'Semifinal': 'Semifinal',
      'Semifinales': 'Semifinals',
      'Final': 'Final',
      'Tercer lugar': 'Third Place'
    };
    const base = stage.replace(/ - (Ida|Vuelta)$/, '').trim();
    const suffix = stage.endsWith(' - Ida') ? ' - 1st Leg' : stage.endsWith(' - Vuelta') ? ' - 2nd Leg' : '';
    return (map[base] || base) + suffix;
  }

  /** Etiqueta corta de la pierna del cruce: '1st' (ida), '2nd' (vuelta) o '' (partido único / liga). */
  legLabel(stage: string): string {
    if (stage.endsWith(' - Ida')) return '1st';
    if (stage.endsWith(' - Vuelta')) return '2nd';
    return '';
  }

  getMatchesByRound(matches: Match[], stage: string): Match[] {
    return matches.filter(m => m.stage === stage);
  }

  private getTournamentForMatch(matchId: number): Tournament | undefined {
    for (const [tId, matches] of this.matchesByTournament.entries()) {
      if (matches.some(m => m.id === matchId)) {
        return this.tournaments.find(t => t.id === tId);
      }
    }
    return undefined;
  }

  openSimulate(match: Match) {
    if (this.isLockedVuelta(match)) return; // la vuelta se bloquea hasta rellenar la ida
    this.prepareResultModal(match, true);
  }

  openReport(match: Match) {
    if (this.isLockedVuelta(match)) return; // la vuelta se bloquea hasta rellenar la ida
    this.prepareResultModal(match, false);
  }

  /** Abre el formulario de resultado. Si `simulate`, lo rellena al azar tras cargar las plantillas. */
  private prepareResultModal(match: Match, simulate: boolean) {
    this.selectedMatch = match;
    this.actionType = 'report'; // la simulación usa el mismo formulario de reporte
    this.isSimulated = simulate;
    this.formHomeScore = 0;
    this.formAwayScore = 0;
    this.formHomeTiebreak = null;
    this.formAwayTiebreak = null;
    this.formHomePlayers = [];
    this.formAwayPlayers = [];
    this.saveError = '';
    this.showActionModal = true;

    const tournament = this.getTournamentForMatch(match.id);
    this.sportName = tournament?.sport?.name || '';
    this.sportConfig = getSportConfig(this.sportName) ?? null;
    this.statFields = this.sportConfig?.statFields ?? [];
    const maxSets = this.sportConfig?.setsToWin ? this.sportConfig.setsToWin * 2 - 1 : 3;
    this.formHomeSets = Array(maxSets).fill(0);
    this.formAwaySets = Array(maxSets).fill(0);
    this.cdr.detectChanges();

    this.loadingPlayers = true;
    this.cdr.detectChanges();

    forkJoin([
      this.playerService.getAll(match.homeTeamId, 1, 200),
      this.playerService.getAll(match.awayTeamId, 1, 200)
    ]).subscribe({
      next: ([homePlayers, awayPlayers]) => {
        this.formHomePlayers = homePlayers.items.map((p: any) => ({
          playerId: p.id,
          jerseyNumber: p.jerseyNumber,
          name: `${p.firstName} ${p.lastName}`,
          stats: Object.fromEntries(this.statFields.map(f => [f.key, 0]))
        }));
        this.formAwayPlayers = awayPlayers.items.map((p: any) => ({
          playerId: p.id,
          jerseyNumber: p.jerseyNumber,
          name: `${p.firstName} ${p.lastName}`,
          stats: Object.fromEntries(this.statFields.map(f => [f.key, 0]))
        }));
        this.loadingPlayers = false;
        if (simulate) this.applySimulation();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingPlayers = false;
        this.saveError = 'Failed to load players.';
        this.cdr.detectChanges();
      }
    });
  }

  /** Vuelve a tirar los dados sobre el partido ya cargado en el modal. */
  rerollSimulation() {
    if (this.loadingPlayers) return;
    this.saveError = '';
    this.applySimulation();
    this.cdr.detectChanges();
  }

  /**
   * Rellena el formulario con un resultado aleatorio coherente. Se apoya en los mismos
   * guardas del reporte (recalcScore, needsPenalties/GoldenSet/OvertimeWarning) para garantizar
   * la coherencia: vuelve a tirar si sale un empate de eliminatoria que no se puede resolver.
   */
  private applySimulation() {
    const cfg = this.sportConfig;
    const simulate = getSimulator(this.sportName);
    if (!cfg || !simulate) {
      this.saveError = `No simulation available for "${this.sportName || 'this sport'}".`;
      return;
    }

    for (let attempt = 0; attempt < 30; attempt++) {
      const res = simulate(this.formHomePlayers.length, this.formAwayPlayers.length, cfg);

      this.formHomePlayers.forEach((p, i) => { p.stats = { ...res.homeStats[i] }; });
      this.formAwayPlayers.forEach((p, i) => { p.stats = { ...res.awayStats[i] }; });

      if (cfg.useSets) {
        const maxSets = this.maxSets;
        this.formHomeSets = Array(maxSets).fill(0);
        this.formAwaySets = Array(maxSets).fill(0);
        (res.homeSets ?? []).forEach((v, i) => { if (i < maxSets) this.formHomeSets[i] = v; });
        (res.awaySets ?? []).forEach((v, i) => { if (i < maxSets) this.formAwaySets[i] = v; });
      } else {
        this.formHomeScore = res.homeScore;
        this.formAwayScore = res.awayScore;
      }
      this.recalcScore();

      // Desempate de eliminatoria reutilizando la misma detección que el reporte manual.
      this.formHomeTiebreak = null;
      this.formAwayTiebreak = null;
      if (this.needsOvertimeWarning()) continue; // empate irresoluble (p.ej. básquet): repetir
      if (this.needsPenalties() || this.needsGoldenSet()) {
        const [h, a] = this.simulateTiebreak();
        this.formHomeTiebreak = h;
        this.formAwayTiebreak = a;
      }
      return;
    }
    // Tras varios intentos seguimos en empate irresoluble: que lo ajuste el usuario.
    this.saveError = 'Could not simulate a decisive result. Adjust the score manually.';
  }

  /** Genera un desempate (penaltis o golden set) que nunca queda igualado. */
  private simulateTiebreak(): [number, number] {
    if (this.needsGoldenSet()) {
      const pts = this.sportConfig?.goldenSetPoints ?? 15;
      const loser = randInt(8, Math.max(8, pts - 2));
      return Math.random() < 0.5 ? [pts, loser] : [loser, pts];
    }
    let h = randInt(3, 5);
    let a = randInt(3, 5);
    while (h === a) a = randInt(3, 5);
    return [h, a];
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedMatch = null;
    this.submittingReport = false;
    this.isSimulated = false;
    this.cdr.detectChanges();
  }

  decrementHomeScore() { this.formHomeScore = Math.max(0, this.formHomeScore - 1); this.cdr.detectChanges(); }
  incrementHomeScore() { this.formHomeScore = this.formHomeScore + 1; this.cdr.detectChanges(); }
  decrementAwayScore() { this.formAwayScore = Math.max(0, this.formAwayScore - 1); this.cdr.detectChanges(); }
  incrementAwayScore() { this.formAwayScore = this.formAwayScore + 1; this.cdr.detectChanges(); }

  onStatChange(player: PlayerFormEntry, key: string) {
    const cap = this.sportConfig?.statCaps?.[key];
    const val = player.stats[key] ?? 0;
    player.stats[key] = Math.max(0, cap != null ? Math.min(cap, val) : val);
    if (this.sportConfig?.autoCalcScore && key === this.sportConfig.scoreStatKey) this.recalcScore();
    this.cdr.detectChanges();
  }

  incStat(player: PlayerFormEntry, key: string) {
    const cap = this.sportConfig?.statCaps?.[key];
    if (cap != null && (player.stats[key] ?? 0) >= cap) return;
    player.stats[key] = (player.stats[key] || 0) + 1;
    if (this.sportConfig?.autoCalcScore && key === this.sportConfig.scoreStatKey) this.recalcScore();
    this.cdr.detectChanges();
  }

  decStat(player: PlayerFormEntry, key: string) {
    player.stats[key] = Math.max(0, (player.stats[key] || 0) - 1);
    if (this.sportConfig?.autoCalcScore && key === this.sportConfig.scoreStatKey) this.recalcScore();
    this.cdr.detectChanges();
  }

  get maxSets(): number {
    return this.sportConfig?.setsToWin ? this.sportConfig.setsToWin * 2 - 1 : 3;
  }

  visibleSets(): number[] {
    const toWin = this.sportConfig?.setsToWin ?? 3;
    const max = this.maxSets;
    const result: number[] = [];
    for (let i = 0; i < max; i++) {
      result.push(i);
      const homeWon = this.formHomeSets.slice(0, i + 1).filter((s, idx) => s > this.formAwaySets[idx]).length;
      const awayWon = this.formAwaySets.slice(0, i + 1).filter((s, idx) => s > this.formHomeSets[idx]).length;
      if (homeWon >= toWin || awayWon >= toWin) break;
    }
    return result;
  }

  recalcScore() {
    if (this.sportConfig?.useSets) {
      this.formHomeScore = this.formHomeSets.filter((s, i) => s > this.formAwaySets[i]).length;
      this.formAwayScore = this.formAwaySets.filter((s, i) => s > this.formHomeSets[i]).length;
      return;
    }
    if (!this.sportConfig?.autoCalcScore) return;
    const statKey = this.sportConfig.scoreStatKey;
    this.formHomeScore = this.formHomePlayers.reduce((sum, p) => sum + (p.stats[statKey] || 0), 0);
    this.formAwayScore = this.formAwayPlayers.reduce((sum, p) => sum + (p.stats[statKey] || 0), 0);
  }

  onSetChange() {
    const cap = this.sportConfig?.setPointCap;
    if (cap != null) {
      for (let i = 0; i < this.formHomeSets.length; i++) {
        this.formHomeSets[i] = Math.min(cap, Math.max(0, this.formHomeSets[i] ?? 0));
        this.formAwaySets[i] = Math.min(cap, Math.max(0, this.formAwaySets[i] ?? 0));
      }
    }
    this.recalcScore();
    this.cdr.detectChanges();
  }

  incSet(team: 'home' | 'away', setIndex: number) {
    const sets = team === 'home' ? this.formHomeSets : this.formAwaySets;
    const cap = this.sportConfig?.setPointCap ?? 99;
    sets[setIndex] = Math.min(cap, sets[setIndex] + 1);
    this.recalcScore();
    this.cdr.detectChanges();
  }

  decSet(team: 'home' | 'away', setIndex: number) {
    const sets = team === 'home' ? this.formHomeSets : this.formAwaySets;
    sets[setIndex] = Math.max(0, sets[setIndex] - 1);
    this.recalcScore();
    this.cdr.detectChanges();
  }

  /** ¿El torneo del partido seleccionado es de eliminatoria? */
  private isKnockout(): boolean {
    const t = this.getTournamentForMatch(this.selectedMatch?.id ?? -1);
    return t?.format === TournamentFormat.Knockout;
  }

  /** ¿Es una vuelta cuya ida aún no se ha jugado? En ese caso no se puede rellenar todavía,
      para evitar empates globales irresolubles (los penaltis se introducen en la vuelta). */
  isLockedVuelta(match: Match): boolean {
    if (!match.stage.endsWith(' - Vuelta')) return false;
    const ida = this.findIdaForVuelta(match);
    return !ida || !ida.isPlayed;
  }

  /** Localiza el partido de ida correspondiente a una vuelta (mismos equipos, invertidos). */
  private findIdaForVuelta(vuelta: Match): Match | undefined {
    const base = vuelta.stage.replace(/ - Vuelta$/, '');
    const matches = this.matchesByTournament.get(vuelta.tournamentId) ?? [];
    return matches.find(m => m.stage === `${base} - Ida` &&
      m.homeTeamId === vuelta.awayTeamId && m.awayTeamId === vuelta.homeTeamId);
  }

  /** ¿El cruce de eliminatoria queda empatado con el marcador actual? (único o global ida/vuelta) */
  private isCrossTied(): boolean {
    const m = this.selectedMatch;
    if (!m || !this.isKnockout()) return false;
    if (m.homeTeamId == null || m.awayTeamId == null) return false;

    const isVuelta = m.stage.includes(' - Vuelta');
    const isIda = m.stage.includes(' - Ida');
    if (isIda) return false; // la ida nunca decide el cruce

    if (!isVuelta) {
      // Partido único: empate directo en el marcador.
      return this.formHomeScore === this.formAwayScore;
    }

    // Vuelta: comparar el global con la ida (emparejando por equipo).
    const ida = this.findIdaForVuelta(m);
    if (!ida || !ida.isPlayed) return false; // sin ida no podemos saberlo; el backend validará
    const idaForVueltaHome = ida.homeTeamId === m.homeTeamId ? ida.homeScore : ida.awayScore;
    const idaForVueltaAway = ida.homeTeamId === m.awayTeamId ? ida.homeScore : ida.awayScore;
    return (this.formHomeScore + idaForVueltaHome) === (this.formAwayScore + idaForVueltaAway);
  }

  /** Hay que pedir penaltis: cruce empatado en un deporte que desempata por penaltis (fútbol). */
  needsPenalties(): boolean {
    return this.isCrossTied() && !!this.sportConfig?.usesPenalties;
  }

  /** Cruce empatado en un deporte que NO usa penaltis ni golden set (baloncesto): avisar de prórroga. */
  needsOvertimeWarning(): boolean {
    return this.isCrossTied() && !this.sportConfig?.usesPenalties && !this.sportConfig?.usesGoldenSet;
  }

  /** Vóley a doble partido: ¿cada equipo ganó una pierna? Entonces la vuelta se decide con golden set. */
  needsGoldenSet(): boolean {
    const m = this.selectedMatch;
    if (!m || !this.isKnockout() || !this.sportConfig?.usesGoldenSet) return false;
    if (!m.stage.includes(' - Vuelta')) return false; // solo la vuelta decide
    if (m.homeTeamId == null || m.awayTeamId == null) return false;
    if (this.formHomeScore === this.formAwayScore) return false; // vuelta aún sin ganador claro

    const ida = this.findIdaForVuelta(m);
    if (!ida || !ida.isPlayed) return false;

    // Sets de cada equipo en la ida, referidos a local/visitante de la VUELTA (en la ida van invertidos).
    const idaVueltaHome = ida.homeTeamId === m.homeTeamId ? ida.homeScore : ida.awayScore;
    const idaVueltaAway = ida.homeTeamId === m.awayTeamId ? ida.homeScore : ida.awayScore;
    if (idaVueltaHome === idaVueltaAway) return false; // ida sin ganador claro (no debería pasar)

    // Empate a una pierna por equipo: los ganadores de cada pierna son distintos.
    return (idaVueltaHome > idaVueltaAway) !== (this.formHomeScore > this.formAwayScore);
  }

  submitReport() {
    if (!this.selectedMatch) return;

    this.recalcScore();

    const validateFn = this.sportConfig?.validate;
    if (validateFn) {
      const error = validateFn(
        this.formHomePlayers.map(p => ({ teamName: this.selectedMatch!.homeTeam?.name || 'Home', stats: { ...p.stats } })),
        this.formAwayPlayers.map(p => ({ teamName: this.selectedMatch!.awayTeam?.name || 'Away', stats: { ...p.stats } }))
      );
      if (error) {
        this.saveError = error;
        this.cdr.detectChanges();
        return;
      }
    }

    if (this.needsOvertimeWarning()) {
      this.saveError = 'El cruce no puede quedar empatado. Juega la prórroga y ajusta el marcador hasta que haya un ganador.';
      this.cdr.detectChanges();
      return;
    }

    const requirePenalties = this.needsPenalties();
    const requireGoldenSet = this.needsGoldenSet();
    const requireTiebreak = requirePenalties || requireGoldenSet;
    if (requireTiebreak) {
      const h = this.formHomeTiebreak ?? 0;
      const a = this.formAwayTiebreak ?? 0;
      if (h === a) {
        this.saveError = requireGoldenSet
          ? 'Empate a un partido por equipo: introduce el golden set (no puede quedar empatado).'
          : 'El cruce está empatado: introduce los penaltis (no pueden quedar empatados).';
        this.cdr.detectChanges();
        return;
      }
    }

    this.submittingReport = true;
    this.cdr.detectChanges();

    const playerStats = [
      ...this.formHomePlayers.map(p => ({ playerId: p.playerId, stats: { ...p.stats } })),
      ...this.formAwayPlayers.map(p => ({ playerId: p.playerId, stats: { ...p.stats } }))
    ];

    const homeName = this.selectedMatch.homeTeam?.name || '';
    const awayName = this.selectedMatch.awayTeam?.name || '';
    const matchId = this.selectedMatch.id;

    // En deportes de sets, el desempate de liga usa los puntos (vóley) / juegos (tenis) totales.
    const isSets = !!this.sportConfig?.useSets;
    const homePoints = isSets ? this.formHomeSets.reduce((s, v) => s + (v || 0), 0) : 0;
    const awayPoints = isSets ? this.formAwaySets.reduce((s, v) => s + (v || 0), 0) : 0;

    this.matchService.updateResult(matchId, {
      homeScore: this.formHomeScore,
      awayScore: this.formAwayScore,
      homePoints,
      awayPoints,
      homeTiebreak: requireTiebreak ? (this.formHomeTiebreak ?? 0) : null,
      awayTiebreak: requireTiebreak ? (this.formAwayTiebreak ?? 0) : null,
      playerStats
    }).subscribe({
      next: () => {
        this.submittingReport = false;
        this.closeActionModal();
        this.successMessage = `Result: ${homeName} ${this.formHomeScore} - ${this.formAwayScore} ${awayName}`;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
        this.loadTournaments();
      },
      error: (err) => {
        this.submittingReport = false;
        this.saveError = err.error?.error || err.error?.message || 'Could not update match result.';
        this.cdr.detectChanges();
      }
    });
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.cdr.markForCheck();
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
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

  trackByTournamentId(index: number, t: Tournament): number { return t.id; }
  trackByIndex(index: number): number { return index; }
  trackByMatchId(index: number, m: Match): number { return m.id || index; }
  trackByPlayerId(index: number, p: PlayerFormEntry): number { return p.playerId; }

  ngOnDestroy(): void {
    if (this.generationTimer) {
      clearInterval(this.generationTimer);
      this.generationTimer = null;
    }
  }
}
