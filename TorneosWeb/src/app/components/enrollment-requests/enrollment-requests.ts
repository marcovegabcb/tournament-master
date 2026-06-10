import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnrollmentRequestService } from '../../services/enrollment-request.service';
import { EnrollmentRequest } from '../../models/enrollment-request';
import { SuccessModalComponent } from '../shared/success-modal/success-modal';
import { ErrorModalComponent } from '../shared/error-modal/error-modal';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-enrollment-requests',
  standalone: true,
  imports: [CommonModule, SuccessModalComponent, ErrorModalComponent, BreadcrumbComponent],
  templateUrl: './enrollment-requests.html',
  styleUrl: './enrollment-requests.css'
})
export class EnrollmentRequestsComponent implements OnInit {
  @Output() navigateHome = new EventEmitter<void>();
  @Output() requestProcessed = new EventEmitter<void>();

  requests: EnrollmentRequest[] = [];
  loading: boolean = true;
  processingId: number | null = null;

  pendingCollapsed = false;
  processedCollapsed = false;

  showSuccessModal: boolean = false;
  successMessage: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  constructor(
    private enrollmentRequestService: EnrollmentRequestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.loading = true;
    this.cdr.detectChanges();
    this.enrollmentRequestService.getAll().subscribe({
      next: (data) => {
        this.requests = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  togglePending() { this.pendingCollapsed = !this.pendingCollapsed; this.cdr.detectChanges(); }
  toggleProcessed() { this.processedCollapsed = !this.processedCollapsed; this.cdr.detectChanges(); }

  approveRequest(id: number) {
    this.processingId = id;
    this.cdr.detectChanges();
    this.enrollmentRequestService.approve(id).subscribe({
      next: (res: any) => {
        this.processingId = null;
        const req = this.requests.find(r => r.id === id);
        if (req) req.status = 'Approved';
        this.successMessage = res.message || 'Enrollment request approved successfully.';
        this.showSuccessModal = true;
        this.requestProcessed.emit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.processingId = null;
        this.errorMessage = err.error?.message || 'Could not approve the request.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  rejectRequest(id: number) {
    this.processingId = id;
    this.cdr.detectChanges();
    this.enrollmentRequestService.reject(id).subscribe({
      next: (res: any) => {
        this.processingId = null;
        const req = this.requests.find(r => r.id === id);
        if (req) req.status = 'Rejected';
        this.successMessage = res.message || 'Enrollment request rejected.';
        this.showSuccessModal = true;
        this.requestProcessed.emit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.processingId = null;
        this.errorMessage = err.error?.message || 'Could not reject the request.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  get breadcrumbSegments(): string[] {
    return ['Home', 'Requests'];
  }

  onBreadcrumb(index: number) {
    if (index === 0) this.navigateHome.emit();
  }

  get pendingRequests(): EnrollmentRequest[] {
    return this.requests.filter(r => r.status === 'Pending');
  }

  get processedRequests(): EnrollmentRequest[] {
    return this.requests.filter(r => r.status !== 'Pending');
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'Pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  getTeamName(req: EnrollmentRequest): string {
    return req.team?.name || req.newTeamName || (req.teamId ? 'Team #' + req.teamId : '—');
  }

  getTeamInitial(req: EnrollmentRequest): string {
    return (req.team?.name || req.newTeamName || '?').charAt(0);
  }

  getTeamPlayers(req: EnrollmentRequest): { firstName: string; lastName: string; jerseyNumber: number }[] {
    if (!req.newTeamPlayersJson) return [];
    try { return JSON.parse(req.newTeamPlayersJson); } catch { return []; }
  }

  isNewTeamRequest(req: EnrollmentRequest): boolean {
    return !req.teamId && !!req.newTeamName;
  }
}
