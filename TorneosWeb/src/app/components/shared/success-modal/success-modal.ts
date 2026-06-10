import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './success-modal.html'
})
export class SuccessModalComponent {
  @Input() show = false;
  @Input() message = '';
  @Input() secondaryLabel = '';
  @Output() close = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();
}
