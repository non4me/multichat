import { Component, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, ButtonModule, InputTextModule],
  template: `
    <div *ngIf="!authService.isLoggedIn()">
      <h1>Авторизация</h1>
      <input pInputText [(ngModel)]="email" placeholder="Email" />
      <input pInputText [(ngModel)]="password" type="password" placeholder="Password" />
      <p-button (click)="authService.signUp(email, password)">Регистрация</p-button>
      <p-button (click)="authService.signIn(email, password)">Вход</p-button>
      <p-button (click)="authService.signInWithGoogle()">Вход через Google</p-button>
    </div>
    <router-outlet *ngIf="authService.isLoggedIn()"></router-outlet>
  `
})
export class AppComponent {
  email = '';
  password = '';
  constructor(public authService: AuthService) {}
}