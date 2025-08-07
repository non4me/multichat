import {ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MessageModule} from 'primeng/message';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {SelectModule} from 'primeng/select';
import {TranslateModule} from '@ngx-translate/core';
import 'emoji-picker-element';
import {SocketServices} from '../../services/socket.services';
import {AuthService} from '../../services/auth.service';
import {Dialog} from 'primeng/dialog';

@Component({
  selector: 'app-chat',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [TranslateModule, CommonModule, FormsModule, MessageModule, InputTextModule, ButtonModule, SelectModule, Dialog],
  templateUrl: './chat.component.html',
  styleUrl: 'chat.component.scss'
})
export class ChatComponent {
  messages;
  newMessage = signal('');
  showEmojiPicker = signal(false);
  isModalVisible = signal(false);

  public authService = inject(AuthService);
  private socketService = inject(SocketServices);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.messages = this.socketService.getMessages();
  }

  showDialog() {
    this.isModalVisible.set(true);
    // this.cdr.markForCheck();
  }

  onModalClose() {
    this.isModalVisible.set(false);
    // this.cdr.markForCheck();
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
