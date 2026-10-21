import { Module } from '@nestjs/common';
import { RaiffeisenController } from './raiffeisen.controller';
import { RaiffeisenService } from './raiffeisen.service';

@Module({
  controllers: [RaiffeisenController],
  providers: [RaiffeisenService],
  exports: [RaiffeisenService],
})
export class RaiffeisenModule {}
