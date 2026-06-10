import { Component, Input, Output, EventEmitter, OnChanges, OnInit, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StadiumService } from '../../services/stadium.service';
import { TeamService } from '../../services/team.service';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Stadium } from '../../models/stadium';
import { SuccessModalComponent } from '../shared/success-modal/success-modal';
import { ErrorModalComponent } from '../shared/error-modal/error-modal';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb';
import { StadiumListViewComponent } from './stadium-list-view/stadium-list-view';
import { StadiumDetailViewComponent } from './stadium-detail-view/stadium-detail-view';
import { StadiumTeamDetailComponent } from './stadium-team-detail/stadium-team-detail';
import { StadiumTournamentDetailComponent } from './stadium-tournament-detail/stadium-tournament-detail';
import { StadiumCreateModalComponent } from './stadium-create-modal/stadium-create-modal';

@Component({
  selector: 'app-stadiums',
  standalone: true,
  imports: [CommonModule, SuccessModalComponent, ErrorModalComponent, BreadcrumbComponent, StadiumListViewComponent, StadiumDetailViewComponent, StadiumTeamDetailComponent, StadiumTournamentDetailComponent, StadiumCreateModalComponent],
  templateUrl: './stadiums.html',
  styleUrl: './stadiums.css'
})
export class StadiumsComponent implements OnInit, OnChanges {
  allStadiums: Stadium[] = [];
  @Input() activeSportId: number | undefined = 0;
  @Output() navigateHome = new EventEmitter<void>();
  loading: boolean = true;

  viewMode: 'list' | 'detail' | 'teamDetail' | 'tournamentDetail' = 'list';
  stadiumDetails: any = null;
  selectedStadium: Stadium | null = null;
  teamDetails: any = null;
  tournamentDetails: any = null;

  isModalOpen: boolean = false;
  showSuccessModal: boolean = false;
  successMessage: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  constructor(
    private stadiumService: StadiumService,
    private teamService: TeamService,
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadStadiums();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeSportId'] && !changes['activeSportId'].firstChange) {
      this.cdr.detectChanges();
    }
  }

  loadStadiums() {
    this.loading = true;
    this.stadiumService.getAll().subscribe({
      next: (data) => {
        this.allStadiums = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error loading stadiums:', err);
      }
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  onStadiumCreated(created: any) {
    this.allStadiums.push(created);
    this.isModalOpen = false;
    this.successMessage = `Stadium "${created.name}" successfully created!`;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
  }

  showDetails(stadium: Stadium) {
    this.selectedStadium = stadium;
    this.stadiumDetails = null;
    this.viewMode = 'detail';
    this.cdr.detectChanges();

    this.stadiumService.getDetails(stadium.id).subscribe({
      next: (data) => {
        this.stadiumDetails = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading stadium details:', err);
        this.cdr.detectChanges();
      }
    });
  }

  onDeleteStadium(stadium: Stadium) {
    const name = stadium.name;
    const confirmDelete = confirm(`Are you sure you want to permanently delete "${name}"?`);
    if (!confirmDelete) return;

    this.stadiumService.delete(stadium.id).subscribe({
      next: () => {
        this.allStadiums = this.allStadiums.filter(s => s.id !== stadium.id);
        this.successMessage = `Stadium "${name}" successfully deleted!`;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting stadium:', err);
        this.errorMessage = 'Could not delete the stadium.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  onTeamClick(team: any) {
    this.teamDetails = null;
    this.viewMode = 'teamDetail';
    this.cdr.detectChanges();
    this.teamService.getDetails(team.id).subscribe({
      next: (data) => {
        this.teamDetails = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading team details:', err);
        this.cdr.detectChanges();
      }
    });
  }

  onTournamentClick(t: any) {
    this.tournamentDetails = null;
    this.viewMode = 'tournamentDetail';
    this.cdr.detectChanges();
    this.tournamentService.getAll().subscribe({
      next: (all) => {
        const found = all.find(t2 => t2.id === t.id);
        this.tournamentDetails = found || null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading tournament details:', err);
        this.cdr.detectChanges();
      }
    });
  }

  get breadcrumbSegments(): string[] {
    if (this.viewMode === 'teamDetail' && this.teamDetails) {
      return ['Home', 'Stadiums', this.stadiumDetails?.name || '', `🛡️ ${this.teamDetails.name}`];
    }
    if (this.viewMode === 'tournamentDetail' && this.tournamentDetails) {
      return ['Home', 'Stadiums', this.stadiumDetails?.name || '', `🏆 ${this.tournamentDetails.name}`];
    }
    if (this.viewMode === 'detail' && this.stadiumDetails) {
      return ['Home', 'Stadiums', this.stadiumDetails.name];
    }
    return ['Home', 'Stadiums'];
  }

  onBreadcrumb(index: number) {
    if (index === 0) this.navigateHome.emit();
    else if (index === 1 && this.viewMode !== 'list') this.backToList();
    else if (index === 2 && (this.viewMode === 'teamDetail' || this.viewMode === 'tournamentDetail')) this.backToStadiumDetail();
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedStadium = null;
    this.stadiumDetails = null;
    this.cdr.detectChanges();
  }

  backToStadiumDetail() {
    this.viewMode = 'detail';
    this.teamDetails = null;
    this.tournamentDetails = null;
    this.cdr.detectChanges();
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.successMessage = '';
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
  }
}
