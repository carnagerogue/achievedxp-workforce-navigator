import { Global, Module } from '@nestjs/common';
import { CareerOneStopService } from './careeronestop.service';
import { CareerOneStopController } from './careeronestop.controller';

@Global()
@Module({
  controllers: [CareerOneStopController],
  providers: [CareerOneStopService],
  exports: [CareerOneStopService],
})
export class CareerOneStopModule {}
