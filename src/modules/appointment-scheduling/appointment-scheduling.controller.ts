import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { MainValidationPipe } from '../../utils/validate';
import { AppointmentSchedulingService } from './appointment-scheduling.service';
import { RegistrationDto } from './dto';

@Controller('appointment-scheduling')
export class AppointmentSchedulingController {
  constructor(private readonly scheduleService: AppointmentSchedulingService) {}

  @Get(':id')
  getAppointmentScheduling(@Param('id') id: string) {
    return this.scheduleService.getAppointmentScheduling(id);
  }

  @Post('registration')
  @UsePipes(new MainValidationPipe())
  registration(@Body() body: RegistrationDto) {
    return this.scheduleService.registration(body);
  }
}
