import { Request, Response } from 'express';
import * as promClient from 'prom-client';

export function prometheusMiddleware(req: Request, res: Response, next: Function) {
  const httpRequestTotalCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Número total de solicitudes HTTP recibidas por la aplicación',
    labelNames: ['method', 'path', 'status'],
  });

  const startTime = Date.now();
  res.on('finish', () => {
    const elapsedTimeInMs = Date.now() - startTime;
    httpRequestTotalCounter.labels(req.method, req.path, res.statusCode.toString()).inc();
  });

  next();
}