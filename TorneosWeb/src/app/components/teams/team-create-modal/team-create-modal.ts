import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { PlayerService } from '../../../services/player.service';
import { Stadium } from '../../../models/stadium';
import { Team } from '../../../models/team';

interface NewTeamForm {
  name: string;
  captainName: string;
  logoUrl: string;
  prestigePoints: number;
  sportId: number;
  stadiumId: number | undefined;
}

interface TeamPayload {
  name: string;
  captainName: string;
  logoUrl: string;
  prestigePoints: number;
  sportId: number;
  stadiumId: number | undefined;
}

@Component({
  selector: 'app-team-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-create-modal.html'
})
export class TeamCreateModalComponent {
  @Input() activeSportId: number | undefined = 0;
  @Input() stadiumsList: Stadium[] = [];

  /** Tenis: los equipos (jugadores) no tienen sede propia. */
  get isTennis(): boolean {
    return this.activeSportId === 3;
  }

  @Output() created = new EventEmitter<Team>();
  @Output() closed = new EventEmitter<void>();

  newTeam: NewTeamForm = {
    name: '',
    captainName: '',
    logoUrl: '',
    prestigePoints: 100,
    sportId: 0,
    stadiumId: undefined
  };

  newTeamPlayers: { firstName: string; lastName: string; jerseyNumber: number }[] = [];

  saving: boolean = false;
  errorMessage: string = '';
  private hasEmitted = false;

  constructor(
    private teamService: TeamService,
    private playerService: PlayerService,
    private cdr: ChangeDetectorRef
  ) {}

  addPlayer() {
    const nextNum = this.newTeamPlayers.length > 0
      ? Math.max(...this.newTeamPlayers.map(p => p.jerseyNumber)) + 1
      : 1;
    this.newTeamPlayers.push({ firstName: '', lastName: '', jerseyNumber: nextNum });
    this.cdr.detectChanges();
  }

  removePlayer(index: number) {
    this.newTeamPlayers.splice(index, 1);
    this.cdr.detectChanges();
  }

  save() {
    if (!this.newTeam.name?.trim()) {
      this.errorMessage = 'Please enter a team name.';
      return;
    }
    if (this.newTeamPlayers.length === 0) {
      this.errorMessage = 'You must add at least one player.';
      this.cdr.detectChanges();
      return;
    }
    if (this.newTeamPlayers.some(p => !p.firstName.trim() || !p.lastName.trim())) {
      this.errorMessage = 'All players must have a first and last name.';
      this.cdr.detectChanges();
      return;
    }
    const jerseySet = new Set(this.newTeamPlayers.map(p => p.jerseyNumber));
    if (jerseySet.size !== this.newTeamPlayers.length) {
      this.errorMessage = 'Each player must have a unique jersey number within the team.';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.saving = true;
    this.hasEmitted = false;

    const captainName = this.newTeam.captainName ||
      (this.newTeamPlayers[0]?.firstName + ' ' + this.newTeamPlayers[0]?.lastName).trim();

    const payload: TeamPayload = {
      name: this.newTeam.name,
      captainName,
      logoUrl: this.newTeam.logoUrl || '',
      prestigePoints: this.newTeam.prestigePoints || 100,
      sportId: this.activeSportId || 1,
      stadiumId: this.newTeam.stadiumId
    };

    this.teamService.create(payload).subscribe({
      next: (created) => {
        if (this.newTeamPlayers.length === 0) {
          this.saving = false;
          this.hasEmitted = true;
          this.created.emit(created);
          this.cdr.detectChanges();
          return;
        }

        let createdCount = 0;
        let hasError = false;
        for (const p of this.newTeamPlayers) {
          this.playerService.create({
            firstName: p.firstName.trim(),
            lastName: p.lastName.trim(),
            jerseyNumber: p.jerseyNumber,
            teamId: created.id
          }).subscribe({
            next: () => {
              createdCount++;
              if (createdCount === this.newTeamPlayers.length) {
                this.saving = false;
                if (hasError) {
                  this.errorMessage = 'Team created but some players could not be added.';
                }
                this.hasEmitted = true;
                this.created.emit(created);
                this.cdr.detectChanges();
              }
            },
            error: () => {
              hasError = true;
              createdCount++;
              if (createdCount === this.newTeamPlayers.length && !this.hasEmitted) {
                this.saving = false;
                this.errorMessage = 'Team created but some players could not be added.';
                this.hasEmitted = true;
                this.created.emit(created);
                this.cdr.detectChanges();
              }
            }
          });
        }
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'Could not create the team.';
        this.cdr.detectChanges();
      }
    });
  }

  close() {
    this.errorMessage = '';
    this.closed.emit();
  }
}
