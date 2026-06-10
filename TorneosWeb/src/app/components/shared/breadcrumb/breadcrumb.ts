import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumb.html'
})
export class BreadcrumbComponent {
  @Input() segments: string[] = [];
  @Output() navigate = new EventEmitter<number>();
}
