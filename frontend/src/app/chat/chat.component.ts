import {Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MessageModule} from 'primeng/message';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {SelectModule} from 'primeng/select';
import 'emoji-picker-element';
import {TranslateModule} from '@ngx-translate/core';
import {SocketServices} from '../socket.services';
import {AuthService} from '../auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [TranslateModule, CommonModule, FormsModule, MessageModule, InputTextModule, ButtonModule, SelectModule],
  templateUrl: './chat.component.html',
  styleUrl: 'chat.component.scss'
})
export class ChatComponent {
  messages;
  newMessage = signal('');
  showEmojiPicker = signal(false);

  public authService = inject(AuthService);
  private socketService = inject(SocketServices);

  constructor() {
    this.messages = this.socketService.getMessages();
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
      this.socketService.sendMessage(message);

      this.newMessage.set('');
      this.showEmojiPicker.set(false);
    }
  }
}
