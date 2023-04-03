import { Controller, Get, Inject, Response } from '@nestjs/common';
import * as Prometheus from 'prom-client';

@Controller()
export class MetricsController {
  constructor(@Inject('PROMETHEUS') private readonly prometheus: Prometheus.Registry) {}

  @Get('/metrics')
  getMetrics(@Response() res) {
    res.setHeader('Content-Type', this.prometheus.contentType);
    res.end(this.prometheus.metrics());
  }
}
