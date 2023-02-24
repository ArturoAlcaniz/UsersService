import {CanActivate, ExecutionContext, Injectable} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {User} from "$/../../../entities-lib/src/entities/user.entity";
import {UsersService} from "../services/users.service";

@Injectable()
export class AuthenticatedGuard implements CanActivate {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        if (!request.cookies["jwt"]) {
            return false;
        }

        const cookie = request.cookies["jwt"];

        try {
            if (!this.jwtService.verify(cookie)) {
                return false;
            }
        } catch (err) {
            return false;
        }

        const user = this.jwtService.decode(cookie)["userId"];

        if (cookie != this.usersService.usersLoggedIn.get(user)) {
            return false;
        }

        let userEntity: User = await this.usersService.findOne({
            where: {id: user},
        });

        request.user = userEntity;

        return true;
    }
}
