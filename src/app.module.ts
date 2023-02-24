import {Response} from "express";
import {ConfigModule} from "@nestjs/config";
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "$/../../../entities-lib/src/entities/user.entity";
import { jwtConfig } from "$/../../../config-lib/src/jwt.config";
import {AppController} from "./app.controller";
import {HashingModule} from "./hashing/hashing.module";
import {UsersModule} from "./users/users.module";
import {
    Module,
    NestMiddleware,
    MiddlewareConsumer,
} from "@nestjs/common";
import path from "path";
import {HttpModule} from "@nestjs/axios";
import {ThrottlerModule} from "@nestjs/throttler";
import {WinstonModule} from "nest-winston";
import * as winston from "winston";
import { Product } from "$/../../../entities-lib/src/entities/product.entity";
import { ProductImage } from "$/../../../entities-lib/src/entities/productimage.entity";
import { Payment } from "$/../../../entities-lib/src/entities/payment.entity"
import { Code } from "$/../../../entities-lib/src/entities/code.entity";
import { Invoice } from "$/../../../entities-lib/src/entities/invoice.entity";
import { InvoiceItem } from "$/../../../entities-lib/src/entities/invoiceItem.entity";
import { JwtModule } from "@nestjs/jwt";

@Module({
    imports: [
        ConfigModule.forRoot({isGlobal: true}),
        JwtModule.register(jwtConfig()),
        TypeOrmModule.forRoot({
            type: "mariadb",
            host: "database",
            port: 3306,
            username: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            entities: [User,Payment,Product,ProductImage,Code,Invoice,InvoiceItem],
            synchronize: true,
            autoLoadEntities: true,
        }),
        HashingModule,
        UsersModule,
        HttpModule,
        ThrottlerModule.forRoot({
            ttl: 60,
            limit: 10,
        }),
        WinstonModule.forRoot({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({
                    dirname: path.join(__dirname, "./../log/info/"),
                    filename: "info.log",
                    level: "info",
                }),
            ],
        }),
    ],
    providers: [],
    controllers: [AppController],
    exports: [WinstonModule, ThrottlerModule,JwtModule],
})
export class ApplicationModule{}
