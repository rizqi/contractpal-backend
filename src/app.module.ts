import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContractModule } from "./modules/contract/contract.module";
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true , max: 10}),
    ContractModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
