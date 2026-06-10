import { Component, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  @Output() loggedIn = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  email: string = '';
  password: string = '';
  loading: boolean = false;
  error: string = '';

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  login() {
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Please enter email and password.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.loggedIn.emit();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.status === 401 ? 'Invalid credentials.' : 'Connection error.';
        this.cdr.detectChanges();
      }
    });
  }

  cancel() {
    this.cancelled.emit();
  }
}
