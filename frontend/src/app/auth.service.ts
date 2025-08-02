import { Injectable, signal } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal(null);
  isLoggedIn = signal(false);

  constructor(private auth: Auth) {}

  async signUp(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    this.currentUser.set(credential.user);
    this.isLoggedIn.set(true);
  }

  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    this.currentUser.set(credential.user);
    this.isLoggedIn.set(true);
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    this.currentUser.set(credential.user);
    this.isLoggedIn.set(true);
  }

  async logout() {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }
}
