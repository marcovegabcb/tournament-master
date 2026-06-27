import { Component, Input, Output, EventEmitter, OnChanges, OnInit, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StadiumService } from '../../services/stadium.service';
import { TeamService } from '../../services/team.service';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Stadium } from '../../models/stadium';
import { StadiumDetail } from '../../models/stadium-detail';
import { TeamDetail } from '../../models/team-detail';
import { Tournament } from '../../models/tournament';
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
  styleUrl: './stadiums.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StadiumsComponent implements OnInit, OnChanges {
  allStadiums: Stadium[] = [];
  @Input() activeSportId: number | undefined = 0;
  @Output() navigateHome = new EventEmitter<void>();
  loading: boolean = true;

  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  totalCount = 0;

  viewMode: 'list' | 'detail' | 'teamDetail' | 'tournamentDetail' = 'list';
  stadiumDetails: StadiumDetail | null = null;
  selectedStadium: Stadium | null = null;
  teamDetails: TeamDetail | null = null;
  tournamentDetails: Tournament | null = null;

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

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeSportId'] && changes['activeSportId'].currentValue != null) {
      this.loadStadiums(1);
    }
  }

  loadStadiums(page = 1) {
    this.loading = true;
    this.stadiumService.getAll(this.activeSportId || undefined, page, this.pageSize).subscribe({
      next: (data) => {
        this.allStadiums = data.items;
        this.currentPage = data.page;
        this.totalPages = data.totalPages;
        this.totalCount = data.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Could not load stadiums. Please try again.';
        this.showErrorModal = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.loadStadiums(page);
  }

  openModal() {
    this.isModalOpen = true;
  }

  onStadiumCreated(created: Stadium) {
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

  onTeamClick(team: StadiumDetail['teams'][number]) {
    this.teamDetails = null;
    this.viewMode = 'teamDetail';
    this.cdr.detectChanges();
    this.teamService.getDetails(team.id).subscribe({
      next: (data) => {
        this.teamDetails = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || err.error?.message || err.message || `HTTP ${err.status}: Could not load team details.`;
        if (err.error && typeof err.error === 'object') {
          const extra = JSON.stringify(err.error);
          if (extra !== '{}') this.errorMessage += ` (${extra})`;
        }
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  onTournamentClick(t: StadiumDetail['tournaments'][number]) {
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
        this.errorMessage = err.error?.error || 'Could not load tournament details.';
        this.showErrorModal = true;
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
    this.cdr.markForCheck();
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }
}
