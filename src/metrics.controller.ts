import { Controller, Get, Response } from '@nestjs/common';
import * as Prometheus from 'prom-client';

@Controller()
export class MetricsController {
    private prometheus: Prometheus.Registry;

    setPrometheus(prom: Prometheus.Registry) {
        this.prometheus = prom;
    }

    @Get('/metrics')
    getMetrics(@Response() res) {
        res.setHeader('Content-Type', this.prometheus.contentType);
        res.end(this.prometheus.metrics().toString());
    }
}
