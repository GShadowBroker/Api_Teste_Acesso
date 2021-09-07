import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  displayMesage(): string {
    return '#VemSerAcesso';
  }
}
