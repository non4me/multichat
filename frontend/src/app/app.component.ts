import {Component, inject, signal} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';

import {LanguageService} from './language.service';
import {AuthService} from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TranslateModule, RouterOutlet, CommonModule, FormsModule, ButtonModule, InputTextModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  currentLang = signal<string>('en');

  public authService = inject(AuthService);
  private languageService = inject(LanguageService);

  constructor() {
    const savedLanguage = this.languageService.loadLanguage();
    this.currentLang.set(savedLanguage);
  }

  changeLanguage() {
    const language: string = this.currentLang();
    this.languageService.setLanguage(language);
  }
}
