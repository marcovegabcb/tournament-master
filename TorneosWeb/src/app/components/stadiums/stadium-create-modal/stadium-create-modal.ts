import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StadiumService } from '../../../services/stadium.service';

@Component({
  selector: 'app-stadium-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stadium-create-modal.html'
})
export class StadiumCreateModalComponent {
  @Input() activeSportId: number | undefined = 0;

  @Output() created = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  newStadium: any = {
    name: '',
    city: '',
    capacity: 0,
    length: 105,
    width: 68,
    sportId: 0
  };

  saving: boolean = false;
  errorMessage: string = '';

  constructor(
    private stadiumService: StadiumService,
    private cdr: ChangeDetectorRef
  ) {}

  save() {
    if (!this.newStadium.name?.trim()) {
      this.errorMessage = 'Please enter a stadium name.';
      return;
    }
    this.errorMessage = '';
    this.saving = true;

    this.stadiumService.create(this.newStadium).subscribe({
      next: (created) => {
        this.saving = false;
        this.created.emit(created);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = 'Could not create the stadium.';
        this.cdr.detectChanges();
      }
    });
  }

  close() {
    this.errorMessage = '';
    this.closed.emit();
  }
}
