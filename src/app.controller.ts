import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) { }

  getHello(): any {
    throw new Error('Method not implemented.');
  }

  @Get()
  getHealth(): string {
    return 'API is healthy';
  }
}
