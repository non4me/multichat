import {inject, Injectable, signal} from '@angular/core';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from '@angular/fire/auth';
import {browserLocalPersistence, setPersistence} from 'firebase/auth';
import {TranslateService} from '@ngx-translate/core';
import {take} from 'rxjs';

import {SocketServices} from './socket.services';
import {LanguageService} from './language.service';

@Injectable({providedIn: 'root'})
export class AuthService {
  private auth = inject(Auth);
  private translate = inject(TranslateService);
  private socketService = inject(SocketServices);
  private languageService = inject(LanguageService);
  private currentLanguage = this.languageService.currentLanguage;

  currentUser = signal(null);
  isLoggedIn = signal(false);
  errorMessage = signal<string>('');

  constructor() {
    setPersistence(this.auth, browserLocalPersistence)
      .then(() => {
        authState(this.auth).subscribe((user) => {
          this.currentUser.set(user);
          this.isLoggedIn.set(!!user);
          if (user) {
            this.successfulLogin();

            console.log('User automatically logged in:', user.uid);
          }
        });
      })
      .catch((error) => {
        console.error('Persistence error:', error);
      });
  }

  async anonymousLogin() {
    try {
      const credential = await signInAnonymously(this.auth);
      this.currentUser.set(credential.user);
      this.errorMessage.set('');
      this.successfulLogin();
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        this.translate.get('auth.anonymous_disabled')
          .pipe(take(1))
          .subscribe((msg) => {
            this.errorMessage.set(msg);
          });
      } else {
        this.translate.get('auth.generic_error', {message: error.message})
          .pipe(take(1))
          .subscribe((msg) => {
            this.errorMessage.set(msg);
          });
      }
      console.error('Anonymous login error:', error);
    }
  }

  async signUp(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    this.currentUser.set(credential.user);
    this.successfulLogin();
  }

  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    this.currentUser.set(credential.user);
    this.successfulLogin();
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    this.currentUser.set(credential.user);
    this.successfulLogin();
  }

  async logout() {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.socketService.logout()
    localStorage.removeItem('currentUser');
    this.isLoggedIn.set(false);
  }

  private successfulLogin() {
    this.currentUser()?.getIdToken().then((token: string) => {
      this.socketService.initSocket(token, this.currentUser(), this.currentLanguage());
    });

    localStorage.setItem('currentUser', JSON.stringify(this.currentUser()));
    this.isLoggedIn.set(true);
  }
}
