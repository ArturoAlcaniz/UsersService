import {Controller, Get, Res} from "@nestjs/common";
import {ApiTags} from "@nestjs/swagger";
import * as Prometheus from 'prom-client';
import {Response} from "express";

@ApiTags("APP Controller")
@Controller()
export class AppController {}
