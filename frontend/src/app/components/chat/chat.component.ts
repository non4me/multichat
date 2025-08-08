import {Component, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, inject, Signal, signal, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MessageModule} from 'primeng/message';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {SelectModule} from 'primeng/select';
import {TranslateModule} from '@ngx-translate/core';
import {Dialog} from 'primeng/dialog';
import 'emoji-picker-element';

import {Message, SocketServices} from '../../services/socket.services';

@Component({
  selector: 'app-chat',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [TranslateModule, CommonModule, FormsModule, MessageModule, InputTextModule, ButtonModule, SelectModule, Dialog],
  templateUrl: './chat.component.html',
  styleUrl: 'chat.component.scss'
})
export class ChatComponent {
  @ViewChild('messageContainer') messageContainer!: ElementRef<HTMLDivElement>;

  messages: Signal<Message[]>;
  newMessage = signal('');
  showEmojiPicker = signal(false);
  isModalVisible = signal(false);

  private socketService = inject(SocketServices);

  constructor() {
    this.messages = this.socketService.getMessages();

    effect(() => {
      this.messages();
      this.scrollToBottom();
    });
  }

  showDialog() {
    this.isModalVisible.set(true);
  }

  onModalClose() {
    this.isModalVisible.set(false);
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

  private scrollToBottom(): void {
    if (this.messageContainer) {
      const container = this.messageContainer.nativeElement;

      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      })
    }
  }
}
