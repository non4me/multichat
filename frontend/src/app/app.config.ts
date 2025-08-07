import {ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideTranslateHttpLoader} from '@ngx-translate/http-loader';
import {initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {provideTranslateService} from '@ngx-translate/core';
import {provideHttpClient} from '@angular/common/http';
import {getAuth, provideAuth} from '@angular/fire/auth';
import {providePrimeNG} from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import {environment} from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    // provideZoneChangeDetection({eventCoalescing: true}),
    provideZonelessChangeDetection(),
    provideAuth(() => getAuth()),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.my-app-dark',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities'
          }
        }
      }
    }),
    provideTranslateService({
      loader: provideTranslateHttpLoader({prefix: "i18n/", suffix: ".json"}),
      fallbackLang: 'en',
    })
  ]
};
