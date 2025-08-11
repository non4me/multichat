import {TestBed} from '@angular/core/testing';

import {AvatarService} from './avatar-service';

describe('AvatarService', () => {
  let service: AvatarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate an avatar with the correct configuration', () => {
    const canvasMock = document.createElement('canvas');
    canvasMock.width = 200;
    canvasMock.height = 200;
    const contextMock = canvasMock.getContext('2d') as CanvasRenderingContext2D;

    spyOn(document, 'createElement').and.returnValue(canvasMock);
    spyOn(contextMock, 'fillRect');
    spyOn(contextMock, 'fillText');

    const uuid = 'AB';
    const foregroundColor = '#ffffff';
    const backgroundColor = '#123456';
    const result = AvatarService.generateAvatar(uuid, foregroundColor, backgroundColor);

    expect(document.createElement).toHaveBeenCalledWith('canvas');
    expect(contextMock.fillStyle).toBe(backgroundColor);
    expect(contextMock.fillRect).toHaveBeenCalledWith(0, 0, 200, 200);

    expect(contextMock.font).toBe('bold 100px Assistant');
    expect(contextMock.fillStyle).toBe(foregroundColor);
    expect(contextMock.fillText).toHaveBeenCalledWith(uuid, 100, 100);

    expect(result).toBe(canvasMock.toDataURL('image/png'));
  });
});
