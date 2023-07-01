import "./paths";
import { NestFactory } from "@nestjs/core";
import { ApplicationModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import * as Prometheus from "prom-client";
import cookieParser from "cookie-parser";
import { Response, NextFunction } from "express";
import { MetricsController } from "./metrics.controller";

async function bootstrap() {
    // Configura el almacenamiento persistente para las métricas
    const prometheus = new Prometheus.Registry();
    Prometheus.collectDefaultMetrics({ register: prometheus });

    // Crea la aplicación NestJS
    const app = await NestFactory.create(ApplicationModule, {
        snapshot: true,
    });

    // Configura Swagger
    const config = new DocumentBuilder()
        .setTitle("API Document")
        .setDescription("TFG")
        .setVersion("1.0")
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);

    // Configura los middleware globales
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
        })
    );
    app.use(cookieParser());

    // Registra la métrica http_requests_total en el middleware de NestJS
    const httpRequestCounter = new Prometheus.Counter({
        name: "http_requests_total",
        help: "Total number of HTTP requests",
        labelNames: ["method", "path", "status"],
        registers: [prometheus],
    });
    app.use((req, res: Response, next: NextFunction) => {
        res.on("finish", () => {
            httpRequestCounter.labels(
                req.method,
                req.path,
                res.statusCode.toString()
            ).inc();
        });
        next();
    });

    // Configura el controlador de métricas
    const metricsController = app.get(MetricsController);
    metricsController.setPrometheus(prometheus);

    // Inicia la aplicación
    await app.listen(process.env.USERS_CONTAINER_PORT);
}

bootstrap().catch((error) => {
    console.error("Failed to start the application.", error);
});
