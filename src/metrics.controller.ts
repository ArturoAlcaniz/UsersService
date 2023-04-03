import { Controller, Get, Response } from '@nestjs/common';
import * as prometheus from 'prom-client';

@Controller()
export class MetricsController {
    constructor(private readonly prometheus: prometheus.Registry) {}


    @Get('/metrics')
    getMetrics(@Response() res) {
        res.set('Content-Type', this.prometheus.contentType);
        res.end(this.prometheus.metrics());
    }
}
