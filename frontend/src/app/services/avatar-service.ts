import { Injectable } from '@angular/core';

/**
 * A service that provides functionality for generating avatar images.
 */
@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  static generateAvatar(uuid: string, foregroundColor = '#fff', backgroundColor='#367be0') {
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
