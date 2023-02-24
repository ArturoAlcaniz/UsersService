import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {Controller, Post, Body} from "@nestjs/common";
import {UsersService} from "../services/users.service";
import {Throttle} from "@nestjs/throttler";
import {AuthDto} from "../dtos/auth.dto";


@ApiTags("Auth Controller")
@Controller("auth")
export class AuthenticatedController {
    constructor(
        private usersService: UsersService,
    ) {}

    @Throttle(10, 300)
    @ApiOkResponse()
    @Post("loggedIn")
    async getUserLoggedIn(
        @Body() payload: AuthDto
    ) {
        return this.usersService.usersLoggedIn.get(payload.user);
    }
}