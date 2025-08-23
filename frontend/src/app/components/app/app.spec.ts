import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {TestBed} from '@angular/core/testing';
import {RouterOutlet} from '@angular/router';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';

import {AppComponent} from './app.component';
import {LanguageSelector} from '../language-selector/language-selector';
import {AuthService} from '../../services/auth.service';

describe('AppComponent', () => {
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    mockAuthService = {};
    await TestBed.configureTestingModule({
      imports: [
        TranslateModule,
        RouterOutlet,
        CommonModule,
        FormsModule,
        ButtonModule,
        LanguageSelector,
        HttpClientTestingModule
      ],
      providers: [
        {provide: TranslateService, useValue: {get: () => 'English'}},
        {provide: AuthService, useValue: mockAuthService}
      ]
    }).compileComponents();
  })
    ;

    it('should create the AppComponent instance', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      expect(app).toBeTruthy();
    });

    it('should have authService injected', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      expect(app.authService).toBeDefined();
    });
  });
