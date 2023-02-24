import {Controller, Get, Req, UseGuards} from "@nestjs/common";
import {User} from "$/../../../entities-lib/src/entities/user.entity";
import {Request} from "express";
import {AuthenticatedGuard} from "../guards/authenticated.guard";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";

@ApiTags("Session Controller")
@Controller("sessions")
export class SessionsController {

    @ApiOkResponse({type: User})
    @Get("user")
    @UseGuards(AuthenticatedGuard)
    async user(@Req() request: Request) {
        return request.user;
    }
}