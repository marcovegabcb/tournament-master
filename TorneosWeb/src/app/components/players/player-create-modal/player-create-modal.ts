import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../../../services/player.service';
import { Team } from '../../../models/team';
import { Player } from '../../../models/player';

interface NewPlayerForm {
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  matchesPlayed: number;
  teamId: number | undefined;
}

@Component({
  selector: 'app-player-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-create-modal.html'
})
export class PlayerCreateModalComponent {
  @Input() teamsList: Team[] = [];
  @Input() activeSportId: number | undefined = 0;

  @Output() created = new EventEmitter<Player>();
  @Output() closed = new EventEmitter<void>();

  newPlayer: NewPlayerForm = {
    firstName: '',
    lastName: '',
    jerseyNumber: 0,
    matchesPlayed: 0,
    teamId: undefined
  };

  saving = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private playerService: PlayerService,
    private cdr: ChangeDetectorRef
  ) {}

  getFilteredTeams(): Team[] {
    if (!this.activeSportId) return this.teamsList;
    return this.teamsList.filter(t => t.sportId === this.activeSportId);
  }

  get firstNameInvalid() { return this.submitted && !this.newPlayer.firstName?.trim(); }
  get lastNameInvalid()  { return this.submitted && !this.newPlayer.lastName?.trim(); }
  get jerseyInvalid()    { return this.submitted && (this.newPlayer.jerseyNumber < 1 || this.newPlayer.jerseyNumber > 99); }
  get teamInvalid()      { return this.submitted && !this.newPlayer.teamId; }

  save() {
    this.submitted = true;
    if (this.firstNameInvalid || this.lastNameInvalid || this.jerseyInvalid || this.teamInvalid) {
      this.cdr.detectChanges();
      return;
    }
    const team = this.teamsList.find(t => t.id === this.newPlayer.teamId);
    if (team?.players?.some(p => p.jerseyNumber === this.newPlayer.jerseyNumber)) {
      this.errorMessage = `Jersey #${this.newPlayer.jerseyNumber} is already taken in '${team.name}'.`;
      this.cdr.detectChanges();
      return;
    }
    this.errorMessage = '';
    this.saving = true;

    this.playerService.create(this.newPlayer).subscribe({
      next: (created) => {
        this.saving = false;
        this.created.emit(created);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.error || 'Could not create the player.';
        this.cdr.detectChanges();
      }
    });
  }

  close() {
    this.submitted = false;
    this.errorMessage = '';
    this.closed.emit();
  }
}
