import "./paths";
import { NestFactory } from "@nestjs/core";
import { ApplicationModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import * as Prometheus from "prom-client";
import cookieParser from "cookie-parser";
import { ExpressAdapter } from "@nestjs/platform-express";

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

  // Registra la métrica http_requests_total en el middleware de prometheus
  const httpRequestCounter = new Prometheus.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "path", "status"],
    registers: [prometheus],
  });

  // Convierte la aplicación de NestJS a una aplicación de Express
  const expressApp = new ExpressAdapter(app);

  // Registra la ruta para las métricas de Prometheus
  expressApp.get("/metrics", async (req, res) => {
    res.set("Content-Type", Prometheus.register.contentType);
    res.send(await Prometheus.register.metrics());
  });

  // Registra el middleware para registrar las solicitudes HTTP
  expressApp.use((req, res, next) => {
    const end = res.end;
    res.end = function (...args: any) {
      httpRequestCounter
        .labels(req.method, req.path, res.statusCode.toString())
        .inc();
      end.apply(res, args);
    };
    next();
  });

  // Inicia la aplicación
  await app.listen(process.env.USERS_CONTAINER_PORT);
}

bootstrap();
