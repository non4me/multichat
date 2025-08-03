import {inject, Injectable, signal} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translate = inject(TranslateService);
  currentLanguage = signal<string>('en');

  loadLanguage() {
    const savedLanguage = localStorage.getItem('language') || 'en';
    this.setLanguage(savedLanguage);
    return savedLanguage;
  }

  setLanguage(language: string) {
    this.currentLanguage.set(language);
    this.translate.use(language);
  }
}
