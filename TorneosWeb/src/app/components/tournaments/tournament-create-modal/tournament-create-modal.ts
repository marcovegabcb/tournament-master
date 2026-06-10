import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../services/tournament.service';
import { Stadium } from '../../../models/stadium';

@Component({
  selector: 'app-tournament-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-create-modal.html'
})
export class TournamentCreateModalComponent {
  @Input() activeSportId: number | undefined = 0;
  @Input() stadiumsList: Stadium[] = [];

  @Output() created = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  newTournament: any = {
    name: '',
    minPrestigeRequired: 0,
    minPlayersPerTeam: 0,
    format: 0,
    venueConfig: 0,
    sportId: 0,
    stadiumIds: [] as number[]
  };
  selectedStadiumId: number | null = null;
  saving: boolean = false;
  errorMessage: string = '';

  constructor(
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef
  ) {}

  save() {
    if (!this.newTournament.name.trim()) {
      this.errorMessage = 'Please enter a tournament name.';
      return;
    }
    this.errorMessage = '';
    this.saving = true;
    this.newTournament.sportId = this.activeSportId;

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
        this.errorMessage = err.error?.title || err.message || 'Could not create tournament.';
        this.cdr.detectChanges();
      }
    });
  }

  close() {
    this.reset();
    this.closed.emit();
  }

  private reset() {
    this.newTournament = {
      name: '',
      minPrestigeRequired: 0,
      minPlayersPerTeam: 0,
      format: 0,
      venueConfig: 0,
      sportId: this.activeSportId,
      stadiumIds: []
    };
    this.selectedStadiumId = null;
    this.errorMessage = '';
  }
}
