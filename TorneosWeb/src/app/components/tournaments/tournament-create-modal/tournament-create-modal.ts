import { Component, Input, Output, EventEmitter, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService, CreateTournamentDto } from '../../../services/tournament.service';
import { Stadium } from '../../../models/stadium';
import { Tournament } from '../../../models/tournament';
import { getSportConfig } from '../../../sports';

@Component({
  selector: 'app-tournament-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-create-modal.html'
})
export class TournamentCreateModalComponent implements OnInit {
  @Input() activeSportId: number | undefined = 0;
  @Input() stadiumsList: Stadium[] = [];

  ngOnInit() {
    this.onSportChanged();
  }

  @Output() created = new EventEmitter<Tournament>();
  @Output() closed = new EventEmitter<void>();

  newTournament: CreateTournamentDto = {
    name: '',
    minPrestigeRequired: 0,
    minPlayersPerTeam: 0,
    maxPlayersPerTeam: 0,
    format: 0,
    venueConfig: 0,
    sportId: 0,
    stadiumIds: [] as number[]
  };
  // Formato híbrido (grupos + playoffs) aún sin implementar. Poner en true para habilitarlo.
  readonly hybridFormatEnabled = false;

  selectedStadiumId: number | null = null;
  saving = false;
  submitted = false;
  errorMessage = '';
  tennisType: 'singles' | 'doubles' = 'singles';

  constructor(
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef
  ) {}

  get isTennis(): boolean {
    return this.activeSportId != null && (this.activeSportId === 3 || this.newTournament.sportId === 3);
  }

  /** Tenis (3) y vóley (4) usan sets: no tienen sentido en eliminatoria a doble partido. */
  get isSetBasedSport(): boolean {
    const sportId = this.activeSportId ?? this.newTournament.sportId;
    return sportId === 3 || sportId === 4;
  }

  /** Combinación no permitida: solo el tenis (1v1) no se juega a ida/vuelta. El vóley sí: si cada
      equipo gana una pierna, se decide con un golden set en la vuelta. */
  get twoLegBlocked(): boolean {
    return this.isTennis && this.newTournament.format === 1 && this.newTournament.venueConfig === 0;
  }

  /** Si la combinación queda inválida (sets + knockout + ida/vuelta), pasa a partido único. */
  onFormatOrVenueChange() {
    if (this.twoLegBlocked) {
      this.newTournament.venueConfig = 1; // Single Round
    }
  }

  get sportName(): string {
    const config = getSportConfig(
      this.isTennis ? 'Tennis' :
      this.newTournament.sportId === 1 ? 'Football' :
      this.newTournament.sportId === 2 ? 'Basketball' :
      this.newTournament.sportId === 4 ? 'Volleyball' : ''
    );
    return config?.name || '';
  }

  onTennisTypeChange() {
    if (this.tennisType === 'singles') {
      this.newTournament.minPlayersPerTeam = 1;
      this.newTournament.maxPlayersPerTeam = 1;
    } else {
      this.newTournament.minPlayersPerTeam = 2;
      this.newTournament.maxPlayersPerTeam = 2;
    }
  }

  onSportChanged() {
    const sportId = this.activeSportId ?? this.newTournament.sportId;
    const name =
      sportId === 1 ? 'Football' :
      sportId === 2 ? 'Basketball' :
      sportId === 4 ? 'Volleyball' :
      '';
    const config = name ? getSportConfig(name) : null;
    this.newTournament.minPlayersPerTeam = config?.defaultMinPlayers ?? 0;
    this.newTournament.maxPlayersPerTeam = config?.defaultMaxPlayers ?? 0;

    // Tenis se juega siempre en sede neutral.
    if (this.isTennis) {
      this.newTournament.venueConfig = 2;
    }
  }

  get nameInvalid() { return this.submitted && !this.newTournament.name?.trim(); }
  get prestigeInvalid() { return this.submitted && this.newTournament.minPrestigeRequired < 0; }
  get playersRangeInvalid() {
    const min = this.newTournament.minPlayersPerTeam;
    const max = this.newTournament.maxPlayersPerTeam;
    return this.submitted && max > 0 && min > 0 && max < min;
  }

  save() {
    this.submitted = true;
    if (this.nameInvalid || this.prestigeInvalid || this.playersRangeInvalid) {
      this.cdr.detectChanges();
      return;
    }
    if (this.twoLegBlocked) {
      this.errorMessage = `${this.sportName || 'This sport'} knockouts can't be played home and away. Use a single round or neutral venue.`;
      this.cdr.detectChanges();
      return;
    }
    if (!this.hybridFormatEnabled && this.newTournament.format === 2) {
      this.errorMessage = 'The hybrid format (Groups & Playoffs) is not available yet.';
      this.cdr.detectChanges();
      return;
    }
    this.errorMessage = '';
    this.saving = true;
    this.newTournament.sportId = this.activeSportId ?? 0;

    if (this.isTennis) {
      this.onTennisTypeChange();
    }

    if (this.newTournament.venueConfig === 2 && this.selectedStadiumId !== null) {
      this.newTournament.stadiumIds = [this.selectedStadiumId];
    }

    this.tournamentService.create(this.newTournament).subscribe({
      next: (created) => {
        this.saving = false;
        this.created.emit(created);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.error || err.error?.title || 'Could not create tournament.';
        this.cdr.detectChanges();
      }
    });
  }

  close() {
    this.submitted = false;
    this.reset();
    this.closed.emit();
  }

  private reset() {
    this.newTournament = {
      name: '',
      minPrestigeRequired: 0,
      minPlayersPerTeam: 0,
      maxPlayersPerTeam: 0,
      format: 0,
      venueConfig: 0,
      sportId: this.activeSportId ?? 0,
      stadiumIds: []
    };
    this.selectedStadiumId = null;
    this.errorMessage = '';
    this.onSportChanged();
  }
}
