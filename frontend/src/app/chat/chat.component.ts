import {Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MessageModule} from 'primeng/message';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {SelectModule} from 'primeng/select';
import 'emoji-picker-element';
import {LanguageService} from '../language.service';
import {TranslateModule} from '@ngx-translate/core';
import {AuthService} from '../auth.service';

interface Message {
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
export class ChatComponent {
  messages = signal<{ id: number; text: string; emoji: string }[]>([]);
  newMessage = signal('');
  showEmojiPicker = signal(false);

  public authService = inject(AuthService);
  private messageId = 0;

  toggleEmojiPicker() {
    this.showEmojiPicker.set(!this.showEmojiPicker());
  }

  addEmoji(event: any) {
    const emoji = event.detail.unicode;
    this.newMessage.set(this.newMessage() + emoji);
  }

  sendMessage() {
    if (this.newMessage().trim()) {
      this.messages.update(messages => [
        ...messages,
        {id: this.messageId++, text: this.newMessage(), emoji: ''}
      ]);
      this.newMessage.set('');
      this.showEmojiPicker.set(false);
    }
  }
}
