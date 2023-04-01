import './paths';
import {NestFactory} from "@nestjs/core";
import {ApplicationModule} from "./app.module";
import {SwaggerModule, DocumentBuilder} from "@nestjs/swagger";
import {ValidationPipe} from "@nestjs/common";
import cookieParser from "cookie-parser";
import { prometheusMiddleware } from './middlewares/prometheus.middleware';

async function bootstrap() {

    const app = await NestFactory.create(ApplicationModule, {
        snapshot: true,
        logger: ['error', 'warn'],
    });

    const config = new DocumentBuilder()
        .setTitle("API Document")
        .setDescription("TFG")
        .setVersion("1.0")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
        })
    );

    app.use(cookieParser());
    app.use(prometheusMiddleware);

    await app.listen(process.env.USERS_CONTAINER_PORT);
}
bootstrap();
