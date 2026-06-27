import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StadiumService } from '../../../services/stadium.service';
import { Stadium } from '../../../models/stadium';

interface NewStadiumForm {
  name: string;
  city: string;
  capacity: number;
  length: number;
  width: number;
  sportId: number;
}

@Component({
  selector: 'app-stadium-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stadium-create-modal.html'
})
export class StadiumCreateModalComponent {
  @Input() activeSportId: number | undefined = 0;

  @Output() created = new EventEmitter<Stadium>();
  @Output() closed = new EventEmitter<void>();

  newStadium: NewStadiumForm = {
    name: '',
    city: '',
    capacity: 0,
    length: 105,
    width: 68,
    sportId: 0
  };

  saving = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private stadiumService: StadiumService,
    private cdr: ChangeDetectorRef
  ) {}

  get nameInvalid()     { return this.submitted && !this.newStadium.name?.trim(); }
  get cityInvalid()     { return this.submitted && !this.newStadium.city?.trim(); }
  get capacityInvalid() { return this.submitted && (this.newStadium.capacity == null || this.newStadium.capacity <= 0); }
  get lengthInvalid()   { return this.submitted && (this.newStadium.length == null || this.newStadium.length <= 0); }
  get widthInvalid()    { return this.submitted && (this.newStadium.width == null || this.newStadium.width <= 0); }

  save() {
    this.submitted = true;
    if (this.nameInvalid || this.cityInvalid || this.capacityInvalid || this.lengthInvalid || this.widthInvalid) {
      this.cdr.detectChanges();
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
        this.errorMessage = err.error?.error || 'Could not create the stadium.';
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
