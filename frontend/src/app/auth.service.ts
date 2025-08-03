import {inject, Injectable, signal} from '@angular/core';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from '@angular/fire/auth';
import { browserLocalPersistence, setPersistence } from 'firebase/auth';
import {TranslateService} from '@ngx-translate/core';
import {take} from 'rxjs';

@Injectable({providedIn: 'root'})
export class AuthService {
  private auth = inject(Auth);
  private translate = inject(TranslateService);

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
    localStorage.removeItem('currentUser');
    this.isLoggedIn.set(false);
  }

  private async loginWithAccessToken(accessToken: string) {
    try {
      const userCredential = await signInWithCustomToken(this.auth, accessToken);
      this.currentUser.set(userCredential.user);
      this.successfulLogin();
    } catch (error) {
      console.error('Login error:', error);
    }
  }

  private successfulLogin() {
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser()));
    this.isLoggedIn.set(true);
  }
}
