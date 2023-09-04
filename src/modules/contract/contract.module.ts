import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { BaseDataService } from './base-data.service';
import { ContractController } from './contract.controller';

@Module({
  controllers: [ContractController],
  providers: [ContractService, BaseDataService]
})
export class ContractModule {}