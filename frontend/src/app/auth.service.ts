import {Injectable, signal} from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from '@angular/fire/auth';

@Injectable({providedIn: 'root'})
export class AuthService {
  currentUser = signal(null);
  isLoggedIn = signal(false);

  constructor(private auth: Auth) {
    this.autoLogin();
  }

  async autoLogin() {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));

      if (currentUser) {
        this.currentUser.set(currentUser);
        this.isLoggedIn.set(true);
      }
    } catch (error) {
    }
  }

  async signUp(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    this.currentUser.set(credential.user);
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser()));
    this.isLoggedIn.set(true);
  }

  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    this.currentUser.set(credential.user);
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser()));
    this.isLoggedIn.set(true);
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    this.currentUser.set(credential.user);
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser()));
    this.isLoggedIn.set(true);
  }

  async logout() {
    await signOut(this.auth);
    this.currentUser.set(null);
    localStorage.removeItem('currentUser');
    this.isLoggedIn.set(false);
  }
}
