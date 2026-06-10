import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../../../services/player.service';
import { Team } from '../../../models/team';

@Component({
  selector: 'app-player-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-create-modal.html'
})
export class PlayerCreateModalComponent {
  @Input() teamsList: Team[] = [];
  @Input() activeSportId: number | undefined = 0;

  @Output() created = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  newPlayer: any = {
    firstName: '',
    lastName: '',
    jerseyNumber: 0,
    matchesPlayed: 0,
    teamId: undefined
  };

  saving: boolean = false;
  errorMessage: string = '';

  constructor(
    private playerService: PlayerService,
    private cdr: ChangeDetectorRef
  ) {}

  getFilteredTeams(): Team[] {
    if (!this.activeSportId) return this.teamsList;
    return this.teamsList.filter(t => t.sportId === this.activeSportId);
  }

  save() {
    if (!this.newPlayer.firstName?.trim() || !this.newPlayer.lastName?.trim()) {
      this.errorMessage = 'Please enter first and last name.';
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
        this.errorMessage = 'Could not create the player.';
        this.cdr.detectChanges();
      }
    });
  }

  close() {
    this.errorMessage = '';
    this.closed.emit();
  }
}
