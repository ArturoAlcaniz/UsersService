import { Test, TestingModule } from "@nestjs/testing"
import { UsersController } from "../src/users/controllers/users.controller"
import { UsersModule } from "../src/users/users.module";
import { describe, expect, test, beforeEach, afterAll } from '@jest/globals';

import { ApplicationModule } from "../src/app.module";
import { INestApplication } from "@nestjs/common";

describe('UsersController', () => {
    let app: INestApplication;
    
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ApplicationModule,UsersModule]
        }).compile();

        app = module.createNestApplication();

        await app.init();
    });


    afterAll(async () => {
        await app.close();
    })

    test('Should be defined', () => {
        expect(app).toBeDefined();
    });

})