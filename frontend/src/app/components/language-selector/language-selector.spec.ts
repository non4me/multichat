import {ComponentFixture, TestBed} from '@angular/core/testing';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {HttpClientTestingModule, provideHttpClientTesting} from '@angular/common/http/testing';

import {LanguageSelector} from './language-selector';

describe('LanguageSelector', () => {
  let component: LanguageSelector;
  let fixture: ComponentFixture<LanguageSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSelector, TranslateModule, HttpClientTestingModule],
      providers: [
        provideHttpClientTesting(),
        {provide: TranslateService, useValue: {get: () => 'English'}}
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LanguageSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the list of languages', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('select option').length).toBe(component.languages.length);
  });

  it('should call setLanguage on language change', () => {
    const languageServiceSpy = spyOn(component['languageService'], 'setLanguage');
    const mockEvent = {value: 'en'};
    component.onLanguageChange(mockEvent);
    expect(languageServiceSpy).toHaveBeenCalledWith('en');
  });

  it('should have selectedLanguage set to currentLanguage', () => {
    expect(component.selectedLanguage).toBe(component['languageService'].currentLanguage);
  });
});
