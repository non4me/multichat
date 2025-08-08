import {inject, Injectable, Signal, signal} from '@angular/core';
import {io, Socket} from 'socket.io-client';

import {environment} from '../../environments/environment';
import {LanguageService} from './language.service';

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

  private languageService = inject(LanguageService);
  private messages = signal<Message[]>([]);
  private messageId = 0;
  private currentUser: any;
  private socket: Socket;

  initSocket(token: string, user: any) {
    this.currentUser = user;
    this.socket = io(environment.backendUrl, {auth: {token}});
    this.socket.on('message', (msg: Message) => {
      msg.owner = msg.user.uid === this.currentUser.uid
      msg.avatar = this.generateAvatar(msg.user.uid);

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

  private generateAvatar(uuid: string, foregroundColor = '#fff', backgroundColor='#367be0') {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = 200;
    canvas.height = 200;

    // Draw background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    context.font = "bold 100px Assistant";
    context.fillStyle = foregroundColor;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(uuid, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
  }
}
