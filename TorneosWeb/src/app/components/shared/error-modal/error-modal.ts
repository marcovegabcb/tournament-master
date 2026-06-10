import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-modal.html'
})
export class ErrorModalComponent {
  @Input() show = false;
  @Input() message = '';
  @Output() close = new EventEmitter<void>();
}
