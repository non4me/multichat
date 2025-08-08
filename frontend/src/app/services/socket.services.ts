import {inject, Injectable, Signal, signal} from '@angular/core';
import {io, Socket} from 'socket.io-client';
import {environment} from '../../environments/environment';
import {LanguageService} from './language.service';

export interface Message {
  id: number;
  owner: boolean;
  user: any;
  text: string;
  translatedText?: string;
  sourceLang: string;
  emoji?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SocketServices {

  private languageService = inject(LanguageService);
  private messages = signal<Message[]>([]);
  private messageId = 0;
  private currentUser: any;
  private socket: Socket;

  initSocket(token: string, user: any) {
    this.currentUser = user;
    this.socket = io(environment.backendUrl, { auth: { token } });
    this.socket.on('message', (msg: Message) => {
      msg.owner = msg.user.uid === this.currentUser.uid

      this.messages.update(msgs => [...msgs, msg]);
    });
    this.setUserLanguage();
  }

  getMessages(): Signal<Message[]> {
    return this.messages;
  }

  setUserLanguage() {
    this.socket.emit('language', this.languageService.currentLanguage());
  }

  sendMessage(message: string) {
    if (message) {
      const newMessage: Message = {
        id: this.messageId++,
        owner: false,
        user: this.currentUser,
        text: message,
        sourceLang: this.languageService.currentLanguage(),
        emoji: '',
        timestamp: new Date()
      };

      this.socket.emit('message', newMessage);
    }
  }

  logout() {
    this.socket.disconnect();
  }
}
