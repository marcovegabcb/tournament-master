import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentsComponent } from './components/tournaments/tournaments';
import { TeamsComponent } from './components/teams/teams';
import { PlayersComponent } from './components/players/players';
import { StadiumsComponent } from './components/stadiums/stadiums';
import { GeneratorComponent } from './components/generator/generator';
import { EnrollmentRequestsComponent } from './components/enrollment-requests/enrollment-requests';
import { FooterComponent } from './components/footer/footer';
import { LoginComponent } from './components/login/login';
import { SportService } from './services/sport.service';
import { TournamentService } from './services/tournament.service';
import { TeamService } from './services/team.service';
import { PlayerService } from './services/player.service';
import { StadiumService } from './services/stadium.service';
import { AuthService } from './services/auth.service';
import { Sport } from './models/sport';
import { Tournament } from './models/tournament';
import { Team } from './models/team';
import { Player } from './models/player';
import { Stadium } from './models/stadium';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TournamentsComponent, TeamsComponent, PlayersComponent, StadiumsComponent, GeneratorComponent, EnrollmentRequestsComponent, FooterComponent, LoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  currentTab: string = 'home';
  sportsList: Sport[] = [];
  allTournaments: Tournament[] = [];
  allTeams: Team[] = [];
  allPlayers: Player[] = [];
  allStadiums: Stadium[] = [];
  filteredTournaments: Tournament[] = [];
  selectedSport: Sport | null = null;
  showLoginModal: boolean = false;

  sportIcons: Record<string, string> = {
    'Football': '⚽',
    'Basketball': '🏀',
    'Tennis': '🎾',
    'Volleyball': '🏐'
  };

  getSportIcon(name: string): string {
    return this.sportIcons[name] || '🎮';
  }

  get totalTournaments(): number { return this.allTournaments.length; }
  get totalTeams(): number { return this.allTeams.length; }
  get totalPlayers(): number { return this.allPlayers.length; }
  get totalStadiums(): number { return this.allStadiums.length; }

  get adminEmail(): string | null { return this.authService.getEmail(); }

  getSportStats(sportId: number) {
    return {
      tournaments: this.allTournaments.filter(t => t.sportId === sportId).length,
      teams: this.allTeams.filter(t => t.sportId === sportId).length,
      players: this.allPlayers.filter(p => {
        if (!p.teamId) return false;
        const team = this.allTeams.find(t => t.id === p.teamId);
        return team?.sportId === sportId;
      }).length,
      stadiums: this.allStadiums.filter(s => s.sportId === sportId).length,
    };
  }

  getSportCount(sportId: number): number {
    const stats = this.getSportStats(sportId);
    switch (this.currentTab) {
      case 'tournaments': return stats.tournaments;
      case 'teams': return stats.teams;
      case 'players': return stats.players;
      case 'stadiums': return stats.stadiums;
      case 'generator': return this.allTournaments.filter(t => t.sportId === sportId && t.status === 1).length;
      default: return stats.tournaments + stats.teams + stats.players + stats.stadiums;
    }
  }

  @ViewChild('slider') slider!: ElementRef<HTMLDivElement>;

  constructor(
    private sportService: SportService,
    private tournamentService: TournamentService,
    private teamService: TeamService,
    private playerService: PlayerService,
    private stadiumService: StadiumService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadSports();
    this.loadTournaments();
    this.loadTeams();
    this.loadPlayers();
    this.loadStadiums();
  }

  scrollLeft() {
    this.slider.nativeElement.scrollBy({ left: -400, behavior: 'smooth' });
  }

  scrollRight() {
    this.slider.nativeElement.scrollBy({ left: 400, behavior: 'smooth' });
  }

  scrollToSport(index: number) {
    const card = (this.slider.nativeElement.children[index] as HTMLElement);
    card?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
  }

  goToSport(sport: Sport, tab: string) {
    this.selectedSport = sport;
    this.filterData();
    this.currentTab = tab;
  }

  loadSports() {
    this.sportService.getAll().subscribe({
      next: (data) => {
        this.sportsList = data;
        if (this.sportsList.length > 0) {
          this.selectSport(this.sportsList[0]);
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading sports:', err)
    });
  }

  loadTournaments() {
    this.tournamentService.getAll().subscribe({
      next: (data) => {
        this.allTournaments = data;
        this.filterData();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading tournaments:', err)
    });
  }

  loadTeams() {
    this.teamService.getAll().subscribe({
      next: (data) => {
        this.allTeams = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading teams:', err)
    });
  }

  loadPlayers() {
    this.playerService.getAll().subscribe({
      next: (data) => {
        this.allPlayers = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading players:', err)
    });
  }

  loadStadiums() {
    this.stadiumService.getAll().subscribe({
      next: (data) => {
        this.allStadiums = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading stadiums:', err)
    });
  }

  selectSport(sport: Sport) {
    this.selectedSport = sport;
    this.filterData();
    this.cdr.detectChanges();
  }

  filterData() {
    if (!this.selectedSport) return;
    this.filteredTournaments = this.allTournaments.filter(
      t => t.sportId === this.selectedSport!.id
    );
  }

  openLogin() {
    this.showLoginModal = true;
  }

  closeLogin() {
    this.showLoginModal = false;
  }

  onLoggedIn() {
    this.showLoginModal = false;
  }

  logout() {
    this.authService.logout();
    if (this.currentTab === 'generator' || this.currentTab === 'requests') {
      this.currentTab = 'home';
    }
  }
}
