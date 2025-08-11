import {Injectable, Signal, signal} from '@angular/core';
import {io, Socket} from 'socket.io-client';

import {environment} from '../../environments/environment';
import {AvatarService} from './avatar-service';

export interface Message {
  id: number;
  owner: boolean;
  avatar?: string;
  userName?: string;
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

  private currentLanguage: string;
  private messages = signal<Message[]>([]);
  private messageId = 0;
  private currentUser: any;
  private socket: Socket;

  initSocket(token: string, user: any, language: string,) {
    this.currentUser = user;
    this.socket = io(environment.backendUrl, {auth: {token}});
    this.socket.on('message', (msg: Message) => {
      msg.owner = msg.user.uid === this.currentUser.uid
      msg.avatar = AvatarService.generateAvatar(msg.user.uid);

      this.messages.update(msgs => [...msgs, msg]);
    });
    this.setUserLanguage(language);
  }

  getMessages(): Signal<Message[]> {
    return this.messages;
  }

  setUserLanguage(language: string) {
    this.currentLanguage = language;
    this.socket.emit('language', language);
  }

  sendMessage(message: string) {
    if (message) {
      const newMessage: Message = {
        id: this.messageId++,
        owner: false,
        user: this.currentUser,
        text: message,
        sourceLang: this.currentLanguage,
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
