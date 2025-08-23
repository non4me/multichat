import {TranslatePipe} from '@ngx-translate/core';
import {Component, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Select} from 'primeng/select';

import {LanguageService} from '../../services/language.service';

@Component({
  selector: 'app-language-selector',
  imports: [
    FormsModule,
    Select,
    TranslatePipe
  ],
  templateUrl: './language-selector.html',
  styleUrl: './language-selector.css'
})
export class LanguageSelector {
  private languageService = inject(LanguageService);
  languages = this.languageService.getLanguages();
  selectedLanguage = this.languageService.currentLanguage;

  onLanguageChange(event: any): void {
    this.languageService.setLanguage(event.value);
  }
}
