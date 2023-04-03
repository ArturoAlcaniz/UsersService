import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as Prometheus from 'prom-client';

@Controller()
export class MetricsController {
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', Prometheus.register.contentType);
    res.send(await Prometheus.register.metrics());
  }
}