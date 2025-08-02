import { Component, signal, effect, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Socket, io } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

interface Message {
  user: string;
  text: string;
  translatedText?: string;
  sourceLang: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, InputTextModule, ButtonModule, SelectModule],
  template: `
    <h1>Чат</h1>
    <p-select [options]="languages()" [(ngModel)]="selectedLanguage" optionLabel="name" optionValue="code" (onChange)="saveLanguage()"></p-select>
    <p-button (click)="authService.logout()">Выход</p-button>
    <div class="chat-messages">
      @for (msg of messages(); track msg.timestamp) {
        <p-message>{{ msg.text }}</p-message>
      }
    </div>
    <input pInputText [(ngModel)]="newMessage" />
    <p-button (click)="sendMessage()">Отправить</p-button>
  `,
  styles: [`.chat-messages { height: 400px; overflow-y: scroll; }`]
})
export class ChatComponent implements OnInit {
  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private socket: Socket;

  messages = signal<Message[]>([]);
  displayMessages = signal<any[]>([]); // Для PrimeNG p-messages
  newMessage = '';
  languages = signal<any[]>([]);
  selectedLanguage = signal(localStorage.getItem('language') || 'en');

  constructor() {
    effect(() => {
      // Обновляем отображаемые сообщения с переводом
      const msgs = this.messages().map(async (msg) => {
        let text = msg.text;
        if (msg.sourceLang !== this.selectedLanguage()) {
          text = await this.translateText(msg.text, this.selectedLanguage(), msg.sourceLang);
        }
        return { severity: 'info', summary: msg.user, detail: `${text} (${new Date(msg.timestamp).toLocaleTimeString()})` };
      });
      Promise.all(msgs).then(res => this.displayMessages.set(res));
    });
  }

  ngOnInit() {
    // Загрузка языков из конфига
    this.http.get('/assets/languages.json').subscribe((langs: any) => this.languages.set(langs));

    // Socket соединение с токеном
    this.authService.currentUser()?.getIdToken().then((token: string) => {
      this.socket = io(environment.backendUrl, { auth: { token } });
      this.socket.on('message', (msg: Message) => {
        this.messages.update(msgs => [...msgs, msg]);
      });
    });
  }

  sendMessage() {
    if (this.newMessage) {
      this.socket.emit('message', { text: this.newMessage, sourceLang: this.selectedLanguage() });
      this.newMessage = '';
    }
  }

  async translateText(text: string, targetLang: string, sourceLang: string): Promise<string> {
    return this.http.post<{ translatedText: string }>(`${environment.backendUrl}/translate`, { text, targetLang, sourceLang }).toPromise().then(res => res.translatedText);
  }

  saveLanguage() {
    localStorage.setItem('language', this.selectedLanguage());
  }
}
