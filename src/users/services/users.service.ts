import {InjectRepository} from "@nestjs/typeorm";
import {User} from "@entities-lib/src/entities/user.entity";
import {CustomHashing} from "@hashing/hashing.service";
import {BaseService} from "@commons/service.commons";
import {DeleteResult, FindOneOptions, Repository} from "typeorm";
import {Inject, Injectable, OnModuleInit} from "@nestjs/common";
import {UserBlocked} from "../types/user-blocked.type";
import {ModifyUserDto} from "@root/src/users/dtos/modifyUser.dto";
import {CodeEmail} from "../types/code-email.type";
import { Rol } from "@entities-lib/src/entities/rolUser.enum";
import {Response, Request} from "express";
import { Logger } from "winston";
import {JwtService} from "@nestjs/jwt";


@Injectable()
export class UsersService extends BaseService<User> implements OnModuleInit {
    usersRegistering: Map<string, User> = new Map<string, User>();
    usersLoggedIn: Map<string, string> = new Map<string, string>();
    usersLoggedInUnconfirmed: Map<string, string> = new Map<string, string>();
    codesSent: Map<string, CodeEmail> = new Map<string, CodeEmail>();
    usersBlocked: Map<string, UserBlocked> = new Map<string, UserBlocked>();
    GOOGLE_CLIENT_ID: string =
        "388959240870-o8ngd13pcgpdp7g8fneg5un7mkgahj73.apps.googleusercontent.com";

    constructor(
        private hashService: CustomHashing,
        @InjectRepository(User) private userRepository: Repository<User>,
        @Inject("winston") private readonly logger: Logger,
        private jwtService: JwtService,
    ) {
        super();
    }

    async checkAdminAccess(response: Response, request: Request): Promise<Boolean> {
        let user: User = await this.obtainUserLogged(request);

        if (user == null || user.rol != "ADMIN") {
            response.status(400).json({
                message: ["invalid_access"],
                formError: "access",
            });
            this.logger.info(
                "Invalid access {ACTION} {IP} {USER}"
                    .replace(
                        "{IP}",
                        request.headers["x-forwarded-for"].toString()
                    )
                    .replace("{USER}", user.email)
                    .replace("{ACTION}", request.path)
            );
            return false;
        }

        return true;
    }

    async obtainUserLogged(request: Request): Promise<User> {
        let user: User = await this.findOne({
            where: {
                id: this.jwtService.decode(request.cookies["jwt"])["userId"],
            },
        });
        return user
    }

    getRepository(): Repository<User> {
        return this.userRepository;
    }

    findOne(options: FindOneOptions<User>): Promise<User> {
        return this.getRepository().findOne(options);
    }

    updateUser(user: User, data: ModifyUserDto): User {
        user.email = data.email;
        user.userName = data.username;
        if (data.newPass) {
            user.password = this.hashService.stringToHash(data.newPass);
            console.log(data.newPass);
        }
        return user;
    }

    createUser(email: string, name: string, pass: string = null): User {
        let user: User = new User();
        user.email = email;
        user.userName = name;
        if (pass != null) {
            user.password = this.hashService.stringToHash(pass);
        }
        return user;
    }

    createUserManagement(email: string, name: string, pass: string = null, rol: Rol, coins: number): User {
        let user: User = this.createUser(email, name, pass)
        user.rol = rol
        user.coins = coins
        return user;
    }

    async modifyUserManagement(email: string, name: string, pass: string = null, rol: Rol, coins: number): Promise<User> {
        let user: User = await this.findOne({where: { email: email}})
        user.userName = name
        if (pass != null) {
            user.password = this.hashService.stringToHash(pass);
        }
        user.rol = rol
        user.coins = coins
        return user;
    }

    verifyPass(user: User, pass: string) {
        return this.hashService.checkHash(pass, user.password);
    }

    async deleteUserWithId(id: string): Promise<DeleteResult> {
        return await this.delete(id)
    }

    async validateLoginGoogle(data: any): Promise<boolean> {
        if (
            !(
                data.aud == this.GOOGLE_CLIENT_ID &&
                data.azp == this.GOOGLE_CLIENT_ID
            )
        ) {
            return false;
        }
        if (data.email_verified != "true") {
            return false;
        }
        if (new Date(data.exp * 1000) < new Date()) {
            return false;
        }
        return true;
    }

    async registerGoogleAccount(data: any) {
        let username = "User" + (await this.getRepository().count());
        let email = data.email;
        let user: User = this.createUser(email, username);
        await this.userRepository.save(user);
    }

    async checkExistGoogleEmail(data: any) {
        return this.findOne({where: {email: data.email}});
    }

    async validateUniqueEmail(user: User) {
        if ((await this.findOne({where: {email: user.email}})) != null) {
            return false;
        }
        return true;
    }

    async validateUniqueEmailWithEmail(email: string) {
        if ((await this.findOne({where: {email: email}})) != null) {
            return false;
        }
        return true;
    }

    async validateUniqueUsername(user: User) {
        if ((await this.findOne({where: {userName: user.userName}})) != null) {
            return false;
        }
        return true;
    }

    async validateUniqueUsernameWithUsername(username: string) {
        if ((await this.findOne({where: {userName: username}})) != null) {
            return false;
        }
        return true;
    }

    validateRol(rol: string) {
        const roles = Object.values(Rol); // Obtenemos un array con los valores del enum Rol
        return roles.includes(rol as Rol);
    }

    async onModuleInit() {
        const email_admin = "admin@tishoptfg.com"

        const existingUser = (await this.userRepository.findOne({where: {email: email_admin}})) != null

        if(!existingUser) {
            let userAdmin = this.createUser(process.env.ADMIN_EMAIL, "ADMIN", process.env.ADMIN_PASS)
            userAdmin.rol = Rol.ADMIN
            this.userRepository.save(userAdmin)
        }
    }
}
