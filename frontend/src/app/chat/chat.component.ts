import {Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MessageModule} from 'primeng/message';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {SelectModule} from 'primeng/select';
import 'emoji-picker-element';
import {TranslateModule} from '@ngx-translate/core';
import {Socket, io} from 'socket.io-client';

import {AuthService} from '../auth.service';
import {environment} from '../../environments/environment';
import {LanguageService} from '../language.service';

interface Message {
  id: number;
  user: string;
  text: string;
  translatedText?: string;
  sourceLang: string;
  emoji?: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [TranslateModule, CommonModule, FormsModule, MessageModule, InputTextModule, ButtonModule, SelectModule],
  templateUrl: './chat.component.html',
  styleUrl: 'chat.component.scss'
})
export class ChatComponent implements OnInit {
  messages = signal<Message[]>([]);
  newMessage = signal('');
  showEmojiPicker = signal(false);

  public authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private currentUser = this.authService.currentUser();
  private socket: Socket;
  private messageId = 0;

  ngOnInit() {
    this.authService.currentUser()?.getIdToken().then((token: string) => {
      this.socket = io(environment.backendUrl, { auth: { token } });
      this.socket.on('message', (msg: Message) => {
        this.messages.update(msgs => [...msgs, msg]);
      });
    });
  }

  toggleEmojiPicker() {
    this.showEmojiPicker.set(!this.showEmojiPicker());
  }

  addEmoji(event: any) {
    const emoji = event.detail.unicode;
    this.newMessage.set(this.newMessage() + emoji);
  }

  sendMessage() {
    const message = this.newMessage().trim();

    if (message) {
      const newMessage = {
        id: this.messageId++,
        user: this.currentUser,
        text: message,
        sourceLang: this.languageService.currentLanguage(),
        emoji: '',
        timestamp: new Date()
      };

      this.socket.emit('message', newMessage);

      this.newMessage.set('');
      this.showEmojiPicker.set(false);
    }
  }
}
