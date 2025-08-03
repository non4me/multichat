import {Component, inject, signal} from '@angular/core';
import {AuthService} from './auth.service';
import {RouterOutlet} from '@angular/router';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {LanguageService} from './language.service';
import {InputGroup} from 'primeng/inputgroup';
import {InputGroupAddon} from 'primeng/inputgroupaddon';
import {TranslateModule} from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TranslateModule, RouterOutlet, CommonModule, FormsModule, ButtonModule, InputTextModule, InputGroup, InputGroupAddon],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  email = '';
  password = '';
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
