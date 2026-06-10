import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { Stadium } from '../../../models/stadium';
import { Player } from '../../../models/player';

@Component({
  selector: 'app-team-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-create-modal.html'
})
export class TeamCreateModalComponent {
  @Input() activeSportId: number | undefined = 0;
  @Input() stadiumsList: Stadium[] = [];
  @Input() playersList: Player[] = [];

  @Output() created = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  newTeam: any = {
    name: '',
    captainName: '',
    logoUrl: '',
    prestigePoints: 100,
    sportId: 0,
    stadiumId: undefined,
    captainPlayerId: undefined
  };

  saving: boolean = false;
  errorMessage: string = '';

  constructor(
    private teamService: TeamService,
    private cdr: ChangeDetectorRef
  ) {}

  get filteredPlayers(): Player[] {
    if (!this.activeSportId) return this.playersList;
    return this.playersList.filter(
      p => p.team?.sportId === this.activeSportId || p.team?.sport?.id === this.activeSportId
    );
  }

  onCaptainChange(playerId: number | undefined) {
    const player = playerId ? this.playersList.find(p => p.id === playerId) : null;
    this.newTeam.captainName = player ? `${player.firstName} ${player.lastName}` : '';
  }

  save() {
    if (!this.newTeam.name?.trim()) {
      this.errorMessage = 'Please enter a team name.';
      return;
    }
    this.errorMessage = '';
    this.saving = true;

    const payload: any = {
      name: this.newTeam.name,
      captainName: this.newTeam.captainName || '',
      logoUrl: this.newTeam.logoUrl || '',
      prestigePoints: this.newTeam.prestigePoints || 100,
      sportId: this.activeSportId || 1,
      stadiumId: this.newTeam.stadiumId
    };
    if (this.newTeam.captainPlayerId) {
      payload.captainId = this.newTeam.captainPlayerId;
    }

    this.teamService.create(payload).subscribe({
      next: (created) => {
        this.saving = false;
        this.created.emit(created);
        this.cdr.detectChanges();
      },
      error: (err) => {
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
