import { Controller, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Controller('tasks-service')
export class TasksServiceController {
    private readonly logger = new Logger(TasksServiceController.name);

    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleCron() {
        const cronURL = process.env.API_TARGET;
        if(cronURL){
            this.logger.log('Every 10 minutes, avoid shutting down the server');
            await fetch(cronURL)
            this.logger.log('Called :: '+cronURL);
        }
    }
}
