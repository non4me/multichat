import {HttpClient} from '@angular/common/http';
import {inject, Injectable, signal} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';

import {SocketServices} from './socket.services';

export interface Language {
  code: string;
  name: string;
  locale: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private languagesUrl = 'assets/languages.json';
  private translate = inject(TranslateService);
  private socketService = inject(SocketServices);
  private http = inject(HttpClient);
  private languages = signal<Language[]>([]);
  currentLanguage = signal<string>('en');

  constructor() {
    this.http.get<Language[]>(this.languagesUrl).subscribe({
      next: (data) => {
        this.languages.set(data);

        const savedLanguage = localStorage.getItem('language') || 'en';
        this.setLanguage(savedLanguage);
      },
      error: (err) => console.error('Failed to load languages:', err)
    });
  }

  setLanguage(language: string) {
    this.currentLanguage.set(language);
    localStorage.setItem('language', language)
    this.translate.use(language);
    // Guard against emitting before socket connection to avoid runtime errors
    if (this.socketService['socket']) {
      this.socketService.setUserLanguage(language);
    }
  }

  getLanguages() {
    return this.languages.asReadonly();
  }
}
