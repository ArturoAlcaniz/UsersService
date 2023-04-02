import './paths';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as Prometheus from 'prom-client';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const promBundle = require("express-prom-bundle");
    // Configura el almacenamiento persistente para las métricas
    const prometheus = new Prometheus.Registry();
    Prometheus.collectDefaultMetrics({ register: prometheus });

    // Crea la aplicación NestJS
    const app = await NestFactory.create(ApplicationModule, {
        snapshot: true,
    });

    // Configura Swagger
    const config = new DocumentBuilder()
        .setTitle('API Document')
        .setDescription('TFG')
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    // Configura los middleware globales
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
        }),
    );
    app.use(cookieParser());

    // Agrega el middleware de prometheus
    app.use(
        promBundle({
            includeMethod: true,
            includePath: true,
            promClient: {
                register: prometheus,
            },
            metricsPath: '/metrics', // aquí definimos la ruta para exponer las métricas
        }),
    );

    // Inicia la aplicación
    await app.listen(process.env.USERS_CONTAINER_PORT);
}
bootstrap();
