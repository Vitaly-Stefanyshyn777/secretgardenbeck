import { Module } from '@nestjs/common';
import { ViewedController } from './viewed.controller';
import { ViewedService } from './viewed.service';

@Module({
  controllers: [ViewedController],
  providers: [ViewedService],
})
export class ViewedModule {}
