import { Component, Input, OnChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../models/match';
import { Tournament } from '../../models/tournament';
import { Team } from '../../models/team';

interface BracketLeg {
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeScore: number;
  awayScore: number;
  isPlayed: boolean;
  label: string;
}

interface BracketTie {
  homeTeam: Team | null;
  awayTeam: Team | null;
  legs: BracketLeg[];
  stage: string;
  isEmpty: boolean;
  // Ganador decidido por el backend (incluye desempate por penaltis). Null si aún no resuelto.
  winnerTeamId?: number | null;
}

interface BracketRound {
  stage: string;
  ties: BracketTie[];
  roundIndex: number;
}

@Component({
  selector: 'app-bracket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bracket.html',
  styleUrl: './bracket.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BracketComponent implements OnChanges {
  @Input() matches: Match[] = [];
  @Input() tournament: Tournament | null = null;

  leftBracket: BracketRound[] = [];
  rightBracket: BracketRound[] = [];
  centerBracket: BracketRound[] = [];
  gridRows: number = 0;

  get rightBracketReversed(): BracketRound[] {
    return [...this.rightBracket].reverse();
  }

  private stageRank: Record<string, number> = {};
  private stageMap: Record<string, string> = {
    'Ronda preliminar': 'Preliminary Round',
    'Octavos de final': 'Round of 16',
    'Cuartos de final': 'Quarterfinals',
    'Semifinal': 'Semifinal',
    'Semifinales': 'Semifinals',
    'Final': 'Final',
    'Tercer lugar': 'Third Place'
  };

  ngOnChanges(): void {
    this.build();
  }

  private build(): void {
    const order = [
      'Ronda preliminar', 'Octavos de final', 'Cuartos de final',
      'Semifinal', 'Semifinales', 'Final', 'Tercer lugar'
    ];
    order.forEach((s, i) => this.stageRank[s] = i);

    const normalize = (s: string) => s.replace(/ - (Ida|Vuelta)$/, '').trim();

    const map = new Map<string, Match[]>();
    for (const m of this.matches) {
      const key = normalize(m.stage);
      const arr = map.get(key) || [];
      arr.push(m);
      map.set(key, arr);
    }

    const sortedStages = Array.from(map.keys()).sort((a, b) => {
      const r = (s: string) => {
        for (const [k, v] of Object.entries(this.stageRank)) {
          if (s.includes(k)) return v;
        }
        return 999;
      };
      return r(a) - r(b);
    });

    const sideStageNames = sortedStages.filter(s => s !== 'Final' && s !== 'Tercer lugar');
    const centerStageNames = sortedStages.filter(s => s === 'Final' || s === 'Tercer lugar');

    const allRawTies = sideStageNames.map(s => this.buildTies(map.get(s) || []));

    let expectedFirst = 2;
    allRawTies.forEach((ties, depth) => {
      const extrapolated = ties.length * Math.pow(2, depth);
      if (extrapolated > expectedFirst) expectedFirst = extrapolated;
    });
    let pow = 2;
    while (pow < expectedFirst) pow *= 2;
    expectedFirst = Math.max(pow, 2);

    const nextRawTies = sideStageNames.length > 1
      ? this.buildTies(map.get(sideStageNames[1]) || [])
      : [];
    const nextExpected = sideStageNames.length > 1
      ? Math.max(expectedFirst / 2, 1)
      : 0;

    const leftRounds: BracketRound[] = [];
    const rightRounds: BracketRound[] = [];

    sideStageNames.forEach((stage, index) => {
      const rawTies = this.buildTies(map.get(stage) || []);
      const expectedCount = Math.max(expectedFirst / Math.pow(2, index), 1);
      const padded = this.padRound(rawTies, expectedCount, index, nextRawTies, nextExpected);

      const leftTies: BracketTie[] = [];
      const rightTies: BracketTie[] = [];

      if (expectedCount === 2) {
        leftTies.push(padded[0]);
        rightTies.push(padded[1]);
      } else {
        const blockSize = expectedCount / 2; 
        for (let i = 0; i < padded.length; i++) {
          if (i < blockSize) {
            leftTies.push(padded[i]);
          } else {
            rightTies.push(padded[i]);
          }
        }
      }

      leftRounds.push({
        stage: this.stageMap[stage] || stage,
        ties: leftTies,
        roundIndex: index
      });

      rightRounds.push({
        stage: this.stageMap[stage] || stage,
        ties: rightTies,
        roundIndex: index
      });
    });

    this.leftBracket = leftRounds;
    this.rightBracket = rightRounds;

    this.propagateByes();

    this.centerBracket = centerStageNames.map(stage => ({
      stage: this.stageMap[stage] || stage,
      ties: (() => {
        const rawTies = this.buildTies(map.get(stage) || []);
        const expected = Math.max(expectedFirst / Math.pow(2, sideStageNames.length), 1);
        const padded: BracketTie[] = [];
        for (let i = 0; i < expected; i++) {
          padded.push(i < rawTies.length ? rawTies[i] : this.emptyTie());
        }
        return padded;
      })(),
      roundIndex: sideStageNames.length
    }));

    if (this.leftBracket.length === 0 && this.rightBracket.length === 0) {
      this.gridRows = 0;
      return;
    }

    const allSideRounds = [...leftRounds, ...rightRounds];
    let maxEnd = 0;
    for (const round of allSideRounds) {
      const r = round.roundIndex;
      const span = Math.pow(2, r + 1);
      for (let t = 0; t < round.ties.length; t++) {
        const end = (t * span) + 1 + span;
        if (end > maxEnd) maxEnd = end;
      }
    }
    this.gridRows = Math.max(maxEnd - 1, 4);
  }

  private padRound(
    rawTies: BracketTie[],
    expectedCount: number,
    index: number,
    nextRawTies: BracketTie[],
    nextExpected: number
  ): BracketTie[] {
    const padded: BracketTie[] = [];
    for (let i = 0; i < expectedCount; i++) {
      padded.push(this.emptyTie());
    }

    if (index === 0 && nextRawTies.length > 0) {
      const nextPadded: BracketTie[] = [];
      for (let i = 0; i < nextExpected; i++) {
        nextPadded.push(i < nextRawTies.length ? nextRawTies[i] : this.emptyTie());
      }

      const usedRawTies = new Set<BracketTie>();
      const firstStageName = rawTies.length > 0 ? rawTies[0].stage : '';

      // 1. Map real matches from first round that correspond to next round teams
      for (let q = 0; q < nextPadded.length; q++) {
        const qTie = nextPadded[q];
        if (qTie.isEmpty) continue;

        const posHome = q * 2;
        const posAway = q * 2 + 1;

        let matchHome: BracketTie | undefined;

        if (qTie.homeTeam?.id != null) {
          matchHome = rawTies.find(t =>
            !usedRawTies.has(t) &&
            (t.homeTeam?.id === qTie.homeTeam?.id || t.awayTeam?.id === qTie.homeTeam?.id)
          );
          if (matchHome) {
            padded[posHome] = matchHome;
            usedRawTies.add(matchHome);
          }
        }

        if (qTie.awayTeam?.id != null) {
          const matchAway = rawTies.find(t =>
            !usedRawTies.has(t) &&
            (t.homeTeam?.id === qTie.awayTeam?.id || t.awayTeam?.id === qTie.awayTeam?.id)
          );
          if (matchAway && matchAway !== matchHome) {
            padded[posAway] = matchAway;
            usedRawTies.add(matchAway);
          }
        }
      }

      // 2. Place remaining unmatched ties in the first empty slots
      for (const tie of rawTies) {
        if (!usedRawTies.has(tie)) {
          const firstEmpty = padded.findIndex(t => t.isEmpty);
          if (firstEmpty >= 0) {
            padded[firstEmpty] = tie;
          }
        }
      }

      // 3. Fill remaining empty slots with bye entries from next round teams
      for (let q = 0; q < nextPadded.length; q++) {
        const qTie = nextPadded[q];
        if (qTie.isEmpty) continue;

        const posHome = q * 2;
        const posAway = q * 2 + 1;

        if (padded[posHome].isEmpty && qTie.homeTeam?.id != null) {
          padded[posHome] = this.createByeTie(qTie.homeTeam, firstStageName);
        }
        if (padded[posAway].isEmpty && qTie.awayTeam?.id != null) {
          padded[posAway] = this.createByeTie(qTie.awayTeam, firstStageName);
        }
      }

    } else {
      for (let i = 0; i < rawTies.length; i++) {
        padded[i] = rawTies[i];
      }
    }

    return padded;
  }

  private emptyTie(): BracketTie {
    return {
      homeTeam: null,
      awayTeam: null,
      legs: [{
        homeTeam: null,
        awayTeam: null,
        homeScore: 0,
        awayScore: 0,
        isPlayed: false,
        label: ''
      }],
      stage: '',
      isEmpty: true
    };
  }

  private createByeTie(team: Team | null, stageName: string): BracketTie {
    return {
      homeTeam: team,
      awayTeam: null,
      legs: [{
        homeTeam: team,
        awayTeam: null,
        homeScore: 0,
        awayScore: 0,
        isPlayed: false,
        label: ''
      }],
      stage: stageName,
      isEmpty: false
    };
  }

  private propagateByes(): void {
    for (const bracket of [this.leftBracket, this.rightBracket]) {
      for (let r = 0; r < bracket.length - 1; r++) {
        const cur = bracket[r].ties;
        const nxt = bracket[r + 1].ties;
        for (let i = 0; i < cur.length; i++) {
          const tie = cur[i];
          if (!tie.homeTeam || tie.awayTeam) continue;

          const nextIdx = Math.floor(i / 2);
          if (nextIdx >= nxt.length) continue;

          const nextTie = nxt[nextIdx];
          if (i % 2 === 0) {
            if (!nextTie.homeTeam) {
              nextTie.homeTeam = tie.homeTeam;
              nextTie.legs[0].homeTeam = tie.homeTeam;
            }
          } else {
            if (!nextTie.awayTeam) {
              nextTie.awayTeam = tie.homeTeam;
              nextTie.legs[0].awayTeam = tie.homeTeam;
            }
          }
          nextTie.isEmpty = false;
        }
      }
    }
  }

  private buildTies(matches: Match[]): BracketTie[] {
    const ida = matches.filter(m => m.stage.endsWith('Ida'));
    const vuelta = matches.filter(m => m.stage.endsWith('Vuelta'));
    const singles = matches.filter(m => !m.stage.endsWith('Ida') && !m.stage.endsWith('Vuelta'));

    if (ida.length === 0 && vuelta.length === 0) {
      return singles.map(m => ({
        homeTeam: m.homeTeam ?? null,
        awayTeam: m.awayTeam ?? null,
        legs: [{
          homeTeam: m.homeTeam ?? null,
          awayTeam: m.awayTeam ?? null,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          isPlayed: m.isPlayed,
          label: ''
        }],
        stage: m.stage,
        isEmpty: false,
        winnerTeamId: m.winnerTeamId ?? null
      }));
    }

    const ties: BracketTie[] = [];
    const used = new Set<number>();

    for (const idaMatch of ida) {
      if (used.has(idaMatch.id)) continue;
      const vueltaMatch = vuelta.find(v =>
        !used.has(v.id) &&
        v.homeTeamId === idaMatch.awayTeamId &&
        v.awayTeamId === idaMatch.homeTeamId
      );
      used.add(idaMatch.id);
      if (vueltaMatch) used.add(vueltaMatch.id);

      ties.push({
        homeTeam: idaMatch.homeTeam ?? null,
        awayTeam: idaMatch.awayTeam ?? null,
        legs: [
          {
            homeTeam: idaMatch.homeTeam ?? null,
            awayTeam: idaMatch.awayTeam ?? null,
            homeScore: idaMatch.homeScore,
            awayScore: idaMatch.awayScore,
            isPlayed: idaMatch.isPlayed,
            label: '1st Leg'
          },
          ...(vueltaMatch ? [{
            homeTeam: vueltaMatch.homeTeam ?? null,
            awayTeam: vueltaMatch.awayTeam ?? null,
            homeScore: vueltaMatch.homeScore,
            awayScore: vueltaMatch.awayScore,
            isPlayed: vueltaMatch.isPlayed,
            label: '2nd Leg'
          }] : [])
        ],
        stage: idaMatch.stage.replace(/ - Ida$/, ''),
        isEmpty: false,
        winnerTeamId: vueltaMatch?.winnerTeamId ?? idaMatch.winnerTeamId ?? null
      });
    }

    for (const m of singles) {
      if (!used.has(m.id)) {
        ties.push({
          homeTeam: m.homeTeam ?? null,
          awayTeam: m.awayTeam ?? null,
          legs: [{
            homeTeam: m.homeTeam ?? null,
            awayTeam: m.awayTeam ?? null,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            isPlayed: m.isPlayed,
            label: ''
          }],
          stage: m.stage,
          isEmpty: false,
          winnerTeamId: m.winnerTeamId ?? null
        });
      }
    }

    return ties;
  }

  gridRow(r: number, t: number): string {
    const span = Math.pow(2, r + 1);
    const start = t * span + 1;
    return `${start} / ${start + span}`;
  }

  trackByStage(index: number, r: BracketRound): string { return r.stage; }
  trackByTie(index: number, t: BracketTie): string { return `${t.stage}-${t.homeTeam?.id || ''}-${t.awayTeam?.id || ''}`; }
  trackByIndex(index: number): number { return index; }
  trackByLeg(index: number, l: BracketLeg): string { return l.label || String(index); }

  centerGridRow(t: number): string {
    const start = Math.max(Math.floor((this.gridRows - 1) / 2), 1) + (t * 2);
    return `${start} / ${start + 2}`;
  }

  aggregateScore(tie: BracketTie, isHome: boolean): number {
    // El global se suma por equipo (por id), no por posición: en la vuelta local y
    // visitante están invertidos respecto a la ida.
    const teamId = isHome ? tie.homeTeam?.id : tie.awayTeam?.id;
    if (teamId == null) return 0;
    return tie.legs.reduce((sum, leg) => {
      if (leg.homeTeam?.id === teamId) return sum + leg.homeScore;
      if (leg.awayTeam?.id === teamId) return sum + leg.awayScore;
      return sum;
    }, 0);
  }

  tiePlayed(tie: BracketTie): boolean {
    return tie.legs.some(l => l.isPlayed);
  }

  tieWinner(tie: BracketTie, isHome: boolean): boolean {
    if (!this.tiePlayed(tie)) return false;

    // Preferir el ganador decidido por el backend (resuelve empates por penaltis).
    if (tie.winnerTeamId != null) {
      const teamId = isHome ? tie.homeTeam?.id : tie.awayTeam?.id;
      return teamId != null && teamId === tie.winnerTeamId;
    }

    // Fallback por marcador global. Si está empatado, no hay ganador todavía
    // (pendiente de desempate); no se resaltan goles de visitante.
    const homeTotal = this.aggregateScore(tie, true);
    const awayTotal = this.aggregateScore(tie, false);
    if (homeTotal === awayTotal) return false;
    return isHome ? homeTotal > awayTotal : awayTotal > homeTotal;
  }
}