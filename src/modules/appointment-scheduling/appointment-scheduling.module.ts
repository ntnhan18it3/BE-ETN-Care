import { Module } from '@nestjs/common';
import { AppointmentSchedulingController } from './appointment-scheduling.controller';
import { AppointmentSchedulingService } from './appointment-scheduling.service';

@Module({
  controllers: [AppointmentSchedulingController],
  providers: [AppointmentSchedulingService]
})
export class AppointmentSchedulingModule {}
