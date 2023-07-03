import {LoginDto} from "@entities-lib/src/requests/login.dto";
import {
    Body,
    Inject,
    Post,
    Req,
    Res,
    UseGuards,
    Controller,
    Get,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    StreamableFile,
    Param,
} from "@nestjs/common";
import {Response, Request, response} from "express";
import {CreateUserDto} from "@entities-lib/src/requests/createUser.dto";
import {User} from "@entities-lib/src/entities/user.entity";
import {UsersService} from "../services/users.service";
import {JwtService} from "@nestjs/jwt";
import {AuthenticatedGuard} from "../guards/authenticated.guard";
import {LoginGoogleDto} from "@entities-lib/src/requests/loginGoogle.dto";
import {HttpService} from "@nestjs/axios";
import {firstValueFrom, lastValueFrom} from "rxjs";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {Logger} from "winston";
import {UserBlocked} from "../types/user-blocked.type";
import {Throttle, ThrottlerGuard} from "@nestjs/throttler";
import {ModifyUserDto} from "@entities-lib/src/requests/modifyUser.dto";
import {SendCodeDto} from "@entities-lib/src/requests/sendcode.dto";
import {v4 as uuidv4} from "uuid";
import {SendCodeLoginDto} from "@entities-lib/src/requests/sendCodeLogin.dto";
import {DeleteCodeTokenDto} from "@entities-lib/src/requests/deleteCodeToken.dto";
import {DeleteUserDto} from "@entities-lib/src/requests/deleteUser.dto";
import {CodeEmail} from "../types/code-email.type";
import {FileInterceptor} from "@nestjs/platform-express";
import {Express} from "express";
import {Multer} from "multer";
import {createReadStream} from "fs";
import {join} from "path";
import fs from "fs";
import {BuyCoinsDto} from "@entities-lib/src/requests/buyCoins.dto";
import {PaymentsService} from "../services/payments.service";
import {Payment} from "@entities-lib/src/entities/payment.entity";
import {CreateCodeTokenDto} from "../dtos/createCodeToken.dto";
import {Code} from "@entities-lib/src/entities/code.entity";
import {CodesService} from "../services/codes.service";
import {DeepPartial} from "typeorm";
import {CreateUserManagementDto} from "@entities-lib/src/requests/createUserManagement.dto";
import { Rol } from "@entities-lib/src/entities/rolUser.enum";
import {CheckoutDto} from "@entities-lib/src/requests/checkout.dto";
import {ProductsService} from "../services/products.service";
import { Product } from "@entities-lib/src/entities/product.entity";
import { RedeemCodeTokenDto } from "@entities-lib/src/requests/redeemCodeToken.dto";
import { Invoice } from "@entities-lib/src/entities/invoice.entity";
import { InvoiceItem } from "@entities-lib/src/entities/invoiceItem.entity";
import { InvoicesService } from "../services/invoice.service";
import { InvoiceItemsService } from "../services/invoiceItem.service";
import { plainToClass } from "class-transformer";

@ApiTags("User Controller")
@Controller("users")
export class UsersController {
    constructor(
        private usersService: UsersService,
        private codesService: CodesService,
        private paymentsService: PaymentsService,
        private jwtService: JwtService,
        private httpService: HttpService,
        private productsService: ProductsService,
        @Inject("winston")
        private readonly logger: Logger,
        private invoicesService: InvoicesService,
        private invoiceItemsService: InvoiceItemsService
    ) {}

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("register")
    async createUserSendCode(
        @Body() payload: SendCodeDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        let user: User = this.usersService.createUser(
            payload.email,
            payload.username,
            payload.pass
        );

        if (!(await this.usersService.validateUniqueEmail(user))) {
            response
                .status(400)
                .json({message: ["email_already_exist"], formError: "email"});
            return;
        }

        if (!(await this.usersService.validateUniqueUsername(user))) {
            response.status(400).json({
                message: ["username_already_exist"],
                formError: "username",
            });
            return;
        }

        let codeEmail: CodeEmail = this.createCodeEmail();

        await lastValueFrom(
            this.httpService.post(
                `http://${process.env.MAILER_CONTAINER_NAME}:${process.env.MAILER_CONTAINER_PORT}/mailer/sendCodeRegister`,
                JSON.stringify({email: payload.email, code: codeEmail.code}),
                {
                    headers: {"content-type": "application/json"},
                }
            )
        );

        this.usersService.usersRegistering.set(codeEmail.code, user);
        this.usersService.codesSent.set(payload.email, codeEmail);

        response.status(200).json({
            message: ["sent_code"],
        });

        this.logger.info(
            "Code sent to {EMAIL} {IP}"
                .replace("{IP}", request.headers["x-forwarded-for"].toString())
                .replace("{EMAIL}", payload.email)
        );
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("register2")
    async createUser(
        @Body() payload: CreateUserDto,
        @Res({passthrough: true}) response: Response
    ) {
        if (
            !payload.code ||
            !this.usersService.usersRegistering.get(payload.code)
        ) {
            response.status(400).json({message: ["code_invalid"]});
            return;
        }

        let user: User = this.usersService.usersRegistering.get(payload.code);

        if (!(await this.usersService.validateUniqueEmail(user))) {
            response
                .status(400)
                .json({message: ["email_already_exist"], formError: "email"});
            return;
        }

        if (!(await this.usersService.validateUniqueUsername(user))) {
            response.status(400).json({
                message: ["username_already_exist"],
                formError: "username",
            });
            return;
        }

        if (payload.code != this.usersService.codesSent.get(user.email).code) {
            response.status(400).json({message: ["code_invalid"]});
            return;
        }

        if (!this.checkCodeEmail(this.usersService.codesSent.get(user.email))) {
            response.status(400).json({message: ["code_expired"]});
            return;
        }

        this.usersService.save(user);
        this.usersService.usersRegistering.delete(payload.code);
        response.status(200).json({message: ["successfully_registered"]});
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 60)
    @ApiOkResponse()
    @Post("login2")
    async login2(
        @Body() payload: SendCodeLoginDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        const user = this.jwtService.decode(request.cookies["jwt"])["userId"];

        let u: User = await this.usersService.findOne({
            where: {id: user},
        });

        if (
            request.cookies["jwt"] !=
            this.usersService.usersLoggedInUnconfirmed.get(user)
        ) {
            response.status(400).json({message: ["login_invalid"]});
            return;
        }

        if (
            !payload.code ||
            payload.code != this.usersService.codesSent.get(u.email).code
        ) {
            response.status(400).json({message: ["code_invalid"]});
            return;
        }

        if (!this.checkCodeEmail(this.usersService.codesSent.get(u.email))) {
            response.status(400).json({message: ["code_expired"]});
            return;
        }

        this.usersService.usersLoggedIn.set(
            user,
            this.usersService.usersLoggedInUnconfirmed.get(user)
        );
        this.usersService.usersLoggedInUnconfirmed.delete(user);

        response.status(200).json({
            message: ["successfully_logged_in"],
            userName: u.userName,
            email: u.email,
            coins: u.coins,
            avatar: u.avatar,
            rol: u.rol,
        });
        this.logger.info(
            "Login Sucessfully {IP}".replace(
                "{IP}",
                request.headers["x-forwarded-for"].toString()
            )
        );
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 60)
    @ApiOkResponse()
    @Post("login")
    async login(
        @Body() payload: LoginDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        let user: User = await this.usersService.findOne({
            where: {email: payload.email},
        });

        if (this.verifyBlockUser(request, payload.email)) {
            response.status(400).json({
                message: ["too_many_attempts"],
                formError: "too_many_attempts",
                bannedDuring: this.obtainSecondsBanned(request, payload.email),
            });
            this.logger.info(
                "Fail Login (attempts) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (user == null || !this.usersService.verifyPass(user, payload.pass)) {
            response.status(400).json({
                message: ["invalid_credentials"],
                formError: "password",
            });
            this.logger.info(
                "Fail Login (invalid) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            this.countFailAttempt(request, payload.email);
            return;
        }

        let codeEmail: CodeEmail = this.createCodeEmail();

        await lastValueFrom(
            this.httpService.post(
                `http://${process.env.MAILER_CONTAINER_NAME}:${process.env.MAILER_CONTAINER_PORT}/mailer/sendCodeLogin`,
                JSON.stringify({email: payload.email, code: codeEmail.code}),
                {
                    headers: {"content-type": "application/json"},
                }
            )
        );

        const jwt = this.jwtService.sign({userId: user.id});
        this.usersService.usersLoggedInUnconfirmed.set(user.id, jwt);
        this.usersService.codesSent.set(user.email, codeEmail);

        response.cookie("jwt", jwt, {
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });
        response.status(200).json({
            message: ["sent_code"],
        });

        this.logger.info(
            "Code sent to {EMAIL} {IP}"
                .replace("{IP}", request.headers["x-forwarded-for"].toString())
                .replace("{EMAIL}", payload.email)
        );
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 60)
    @UseGuards(AuthenticatedGuard)
    @ApiOkResponse()
    @Post("buyCoins")
    async buyCoins(
        @Body() payload: BuyCoinsDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        let user: User = await this.usersService.findOne({
            where: {
                id: this.jwtService.decode(request.cookies["jwt"])["userId"],
            },
        });

        const headersRequest = {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(
                process.env.CLIENT_ID + ":" + process.env.SECRET_ID
            ).toString("base64")}`,
        };

        const infoPayment = await firstValueFrom(
            this.httpService.get(
                "https://www.sandbox.paypal.com/v2/checkout/orders/" +
                    payload.id +
                    "?grant_type=client_credentials&ignoreCache=true",
                {headers: headersRequest}
            )
        );

        if (infoPayment.data.status != "COMPLETED") {
            response.status(400).json({message: "Error buying coins"});
            return;
        }

        let payment: Payment = this.paymentsService.createPayment(
            payload.id,
            infoPayment.data.purchase_units[0].amount.value,
            user
        );

        if (!(await this.paymentsService.validatePayment(payment))) {
            response.status(400).json({message: "Payment already added"});
            return;
        }

        await this.paymentsService.save(payment);

        user.coins = user.coins + payment.coins;

        await this.usersService.save(user);

        response.status(200).json({
            message: ["successfully_payment"],
            coins: user.coins,
        });
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 60)
    @ApiOkResponse()
    @Post("loginGoogle")
    async loginGoogle(
        @Body() payload: LoginGoogleDto,
        @Res({passthrough: true}) response: Response
    ) {
        const infoUserGoogle = await firstValueFrom(
            this.httpService.get(
                "https://oauth2.googleapis.com/tokeninfo?id_token=" +
                    payload.token
            )
        );
        const validated = await this.usersService.validateLoginGoogle(
            infoUserGoogle.data
        );

        if (!validated) {
            response.status(400).json({message: ["google_login_not_valid"]});
            return;
        }

        if (
            !(await this.usersService.checkExistGoogleEmail(
                infoUserGoogle.data
            ))
        ) {
            await this.usersService.registerGoogleAccount(infoUserGoogle.data);
        }

        let user: User = await this.usersService.findOne({
            where: {email: infoUserGoogle.data.email},
        });

        if (user == null) {
            response.status(400).json({message: ["google_login_not_valid"]});
            return;
        }

        const jwt = this.jwtService.sign({userId: user.id});
        this.usersService.usersLoggedIn.set(user.id, jwt);

        response.cookie("jwt", jwt, {
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });
        response.status(200).json({
            message: ["successfully_logged_in"],
            userName: user.userName,
            email: user.email,
            coins: user.coins,
            avatar: user.avatar,
        });
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("modify")
    @UseGuards(AuthenticatedGuard)
    @UseInterceptors(FileInterceptor("avatar"))
    async modifyUser(
        @Body() payload: ModifyUserDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request,
        @UploadedFile() avatar: Express.Multer.File
    ) {
        let user: User = await this.usersService.findOne({
            where: {
                id: this.jwtService.decode(request.cookies["jwt"])["userId"],
            },
        });

        if (
            user == null ||
            (user.password == null && payload.pass != "") ||
            (user.password != null &&
                !this.usersService.verifyPass(user, payload.pass))
        ) {
            response.status(400).json({
                message: ["invalid_credentials"],
                formError: "actualPassword",
            });
            this.logger.info(
                "Fail Update User (invalid_credentials) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (
            payload.username != user.userName &&
            !(await this.usersService.validateUniqueUsernameWithUsername(
                payload.username
            ))
        ) {
            response.status(400).json({
                message: ["username_already_exist"],
                formError: "username",
            });
            this.logger.info(
                "Fail Update User (username_already_exist) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (
            payload.email != user.email &&
            !(await this.usersService.validateUniqueEmailWithEmail(
                payload.email
            ))
        ) {
            response
                .status(400)
                .json({message: ["email_already_exist"], formError: "email"});
            this.logger.info(
                "Fail Update User (email_already_exist) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        this.usersService.updateUser(user, payload);
        user.avatar = avatar.filename;
        this.usersService.save(user);
        response
            .status(200)
            .json({message: ["successfully_updated"], avatar: user.avatar});
        this.logger.info(
            "Update User Sucessfully {IP} {FILE}"
                .replace("{IP}", request.headers["x-forwarded-for"].toString())
                .replace("{FILE}", avatar.filename)
        );

        await lastValueFrom(
            this.httpService.post(
                `http://${process.env.MAILER_CONTAINER_NAME}:${process.env.MAILER_CONTAINER_PORT}/mailer/sendDataChangedConfirm`,
                JSON.stringify({email: user.email}),
                {
                    headers: {"content-type": "application/json"},
                }
            )
        );
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(200, 30)
    @ApiOkResponse()
    @Get("avatar/:avatar")
    @UseGuards(AuthenticatedGuard)
    async getAvatar(
        @Param("avatar") avatar: string,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        let file = "files/{FILENAME}".replace("{FILENAME}", avatar);
        if (fs.existsSync(file)) {
            const f = createReadStream(join(process.cwd(), file));
            return new StreamableFile(f);
        }
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(200, 30)
    @ApiOkResponse()
    @Get("avatar")
    @UseGuards(AuthenticatedGuard)
    async getAvatarDefault(
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        let file = "static-images/UserProfile.png";
        const f = createReadStream(join(process.cwd(), file));
        return new StreamableFile(f);
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(10, 3000)
    @ApiOkResponse()
    @Post("modifyWithoutAvatar")
    @UseGuards(AuthenticatedGuard)
    async modifyUserWithoutAvatar(
        @Body() payload: ModifyUserDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        let user: User = await this.usersService.findOne({
            where: {
                id: this.jwtService.decode(request.cookies["jwt"])["userId"],
            },
        });

        if (
            user == null ||
            (user.password == null && payload.pass != "") ||
            (user.password != null &&
                !this.usersService.verifyPass(user, payload.pass))
        ) {
            response.status(400).json({
                message: ["invalid_credentials"],
                formError: "actualPassword",
            });
            this.logger.info(
                "Fail Update User (invalid_credentials) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (
            payload.username != user.userName &&
            !(await this.usersService.validateUniqueUsernameWithUsername(
                payload.username
            ))
        ) {
            response.status(400).json({
                message: ["username_already_exist"],
                formError: "username",
            });
            this.logger.info(
                "Fail Update User (username_already_exist) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (
            payload.email != user.email &&
            !(await this.usersService.validateUniqueEmailWithEmail(
                payload.email
            ))
        ) {
            response
                .status(400)
                .json({message: ["email_already_exist"], formError: "email"});
            this.logger.info(
                "Fail Update User (email_already_exist) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        this.usersService.updateUser(user, payload);
        this.usersService.save(user);
        response
            .status(200)
            .json({message: ["successfully_updated"], avatar: user.avatar});
        this.logger.info(
            "Update User Sucessfully {IP} {FILE}".replace(
                "{IP}",
                request.headers["x-forwarded-for"].toString()
            )
        );
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 60)
    @ApiOkResponse()
    @Get("logout")
    @UseGuards(AuthenticatedGuard)
    async logout(
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        this.usersService.usersLoggedIn.delete(request.user.userId);
        response.clearCookie("jwt");
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("deleteCodeToken")
    @UseGuards(AuthenticatedGuard)
    async deleteCodeToken(
        @Body() payload: DeleteCodeTokenDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        if( await this.usersService.checkAdminAccess(response, request) === false ||
            await this.codesService.checkCodeId(response,payload.id) === false
        ) {
            return;
        }

        if((await this.codesService.delete(payload.id)).affected>0) {
            response.status(200).json({
                message: ["code_token_deleted"]
            })
        }
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("modifyCodeToken")
    @UseGuards(AuthenticatedGuard)
    async modifyCodeToken(
        @Body() payload: CreateCodeTokenDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        if((await this.usersService.checkAdminAccess(response, request) === false)) {
            return;
        }
        
        if (payload.id == null || payload.id.length == 0) {
            response
                .status(400)
                .json({message: ["invalid_code"], formError: "id"});
            this.logger.info(
                "Fail Create code (invalid_code) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (!(await this.codesService.findOne({
            where: {id: payload.id}
        }))) {
            response
                .status(400)
                .json({message: ["code_not_exist"], formError: "id"});
            this.logger.info(
                "Fail Modify code (code_not_exist) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return
        }

        if (
            (payload.ends != null &&
            payload.ends.length > 0 &&
            new Date() > new Date(payload.ends)) ||
            (payload.starts != null &&
                payload.starts.length > 0 &&
                new Date(payload.starts) > new Date(payload.ends))
        ) {
            response
                .status(400)
                .json({message: ["invalid_enddate"], formError: "ends"});
            this.logger.info(
                "Fail Create code (invalid_enddate) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        let code: DeepPartial<Code> = await this.codesService.save(
            this.codesService.createCode(payload)
        );

        let user: User = await this.usersService.obtainUserLogged(request);

        response
            .status(200)
            .json({message: ["successfully_code_modified"], code: code});
        this.logger.info(
            "Modify Code Sucessfully {CODE} {IP} {USER}"
                .replace("{IP}", request.headers["x-forwarded-for"].toString())
                .replace("{USER}", user.email)
                .replace("{CODE}", code.id)
        );
    } 

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("createCodeToken")
    @UseGuards(AuthenticatedGuard)
    async createCodeToken(
        @Body() payload: CreateCodeTokenDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {

        if((await this.usersService.checkAdminAccess(response, request) === false)) {
            return;
        }

        if (payload.id == null || payload.id.length == 0) {
            response
                .status(400)
                .json({message: ["invalid_code"], formError: "id"});
            this.logger.info(
                "Fail Create code (invalid_code) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (
            (payload.ends != null &&
            payload.ends.length > 0 &&
            new Date() > new Date(payload.ends)) ||
            (payload.starts != null &&
                payload.starts.length > 0 &&
                new Date(payload.starts) > new Date(payload.ends))
        ) {
            response
                .status(400)
                .json({message: ["invalid_enddate"], formError: "ends"});
            this.logger.info(
                "Fail Create code (invalid_enddate) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (
            (await this.codesService.findOne({where: {id: payload.id}})) != null
        ) {
            response
                .status(400)
                .json({message: ["code_already_exist"], formError: "id"});
            this.logger.info(
                "Fail Create Code (code_already_exist) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        let code: DeepPartial<Code> = await this.codesService.save(
            this.codesService.createCode(payload)
        );

        let user: User = await this.usersService.obtainUserLogged(request);

        response
            .status(200)
            .json({message: ["successfully_code_created"], code: code});
        this.logger.info(
            "Create Code Sucessfully {CODE} {IP} {USER}"
                .replace("{IP}", request.headers["x-forwarded-for"].toString())
                .replace("{USER}", user.email)
                .replace("{CODE}", code.id)
        );
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Get("obtainCode/:code")
    async getCode(@Param("code") code: string) {
        let c: Code = await this.codesService.findOne({
            where: {
                id: code
            }
        })
        return c;
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Get("obtainAllCodes")
    @UseGuards(AuthenticatedGuard)
    async getAllCodes(
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        if((await this.usersService.checkAdminAccess(response, request) === false)) {
            return;
        }

        let codes: Code[] = await this.codesService.find({});

        return codes;
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Get("obtainAllUsers")
    @UseGuards(AuthenticatedGuard)
    async getAllUsers(
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        if((await this.usersService.checkAdminAccess(response, request) === false)) {
            return;
        }

        let users: User[] = await this.usersService.find({});

        return users;
    }
    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("createUser")
    @UseGuards(AuthenticatedGuard)
    async createUserManagement(
        @Body() payload: CreateUserManagementDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ){
        if(await this.usersService.checkAdminAccess(response, request) === false) {
            return;
        }
        
        if(!(await this.usersService.validateUniqueEmailWithEmail(payload.email))) {
            response.status(400).json({
                message: ["invalid_user"]
            })
        }

        if(this.usersService.validateRol(payload.rol)){
            response.status(400).json({
                message: ["invalid_rol"]
            })
        }

        let user: User = this.usersService.createUserManagement(
            payload.email,
            payload.username,
            payload.pass,
            Rol[payload.rol],
            payload.coins
        );

        if(await this.usersService.save(user)) {
            response.status(200).json({
                message: ["user_created"]
            })
        }

    }
    

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("deleteUser")
    @UseGuards(AuthenticatedGuard)
    async deleteUser(
        @Body() payload: DeleteUserDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        if(await this.usersService.checkAdminAccess(response, request) === false) {
            return;
        }

        if(await this.usersService.validateUniqueEmailWithEmail(payload.email)) {
            response.status(400).json({
                message: ["invalid_user"]
            })
        }

        if((await this.usersService.deleteUserWithEmail(payload.email)).affected > 0) {
            response.status(200).json({
                message: ["user_deleted"]
            })
        }
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Get("obtain")
    @UseGuards(AuthenticatedGuard)
    async getUser(
        @Res({passthrough: true}) response: Response,
        @Req() request: Request,
        @Param("username") username: string
    ) {
        if((await this.usersService.checkAdminAccess(response, request) === false)) {
            return;
        }

        let user: User = await this.usersService.findOne({
            where: {userName: username}
        });

        return user;
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(10, 3)
    @ApiOkResponse()
    @Post("redeemCodeToken")
    @UseGuards(AuthenticatedGuard)
    async redeemCodeToken(
        @Body() payload: RedeemCodeTokenDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        let user: User = await this.usersService.obtainUserLogged(request);

        if (user == null) {
            response.status(400).json({
                message: ["invalid_access"],
                formError: "access",
            });
            this.logger.info(
                "Fail Redeem code (invalid_access) {IP} {USER}"
                    .replace(
                        "{IP}",
                        request.headers["x-forwarded-for"].toString()
                    )
                    .replace("{USER}", user.email)
            );
            return;
        }

        let code: Code = await this.codesService.findOne({
            relations: ["users"],
            where: {
                id: payload.id
            }
        });
        if (!code) {
            response
                .status(400)
                .json({message: ["code_not_exist"], formError: "id"});
            this.logger.info(
                "Fail Redeem Code (code_not_exist) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (code.amount <= 0) {
            response
                .status(400)
                .json({message: ["code_not_available"], formError: "id"});
            this.logger.info(
                "Fail Redeem Code (code_not_available) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        if (code.users && code.users.filter(u => user.id === u.id).length>0) {
            response
                .status(400)
                .json({message: ["code_already_redeemed"], formError: "id"});
            this.logger.info(
                "Fail Redeem Code (code_already_redeemed) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        user.coins = user.coins + code.coins;
        await this.usersService.save(user);

        code.amount = code.amount - 1;
        
        if(code.users) {
            code.users.push(user);
        } else {
            code.users = [user];
        }

        await this.codesService.save(code);

        response
            .status(200)
            .json({message: ["successfully_code_redeemed"], coins: user.coins});
        this.logger.info(
            "Create Code Sucessfully {CODE} {IP} {USER}"
                .replace("{IP}", request.headers["x-forwarded-for"].toString())
                .replace("{USER}", user.email)
                .replace("{CODE}", code.id)
        );
    }

    countFailAttempt(request: Request, email: string) {
        const userToCount = this.obtainIpWithEmail(
            request.headers["x-forwarded-for"].toString(),
            email
        );
        const userBlocked = this.usersService.usersBlocked.get(userToCount);
        if (userBlocked.attempts == 0) {
            let newUserBlocked: UserBlocked = {
                firstAttempt: new Date().getTime(),
                until: 0,
                attempts: 1,
            };
            this.usersService.usersBlocked.set(userToCount, newUserBlocked);
            return;
        }
        if (userBlocked.attempts == 1) {
            let newAttempts = 0;
            if (userBlocked.firstAttempt + 60000 > new Date().getTime()) {
                newAttempts = 2;
            }
            let newUserBlocked: UserBlocked = {
                firstAttempt: userBlocked.firstAttempt,
                until: 0,
                attempts: newAttempts,
            };
            this.usersService.usersBlocked.set(userToCount, newUserBlocked);
            return;
        }
        if (userBlocked.attempts == 2) {
            let newUntil = 0;
            if (userBlocked.firstAttempt + 60000 > new Date().getTime()) {
                newUntil = new Date().getTime() + 120000;
            }
            let newUserBlocked: UserBlocked = {
                firstAttempt: 0,
                until: newUntil,
                attempts: 0,
            };
            this.usersService.usersBlocked.set(userToCount, newUserBlocked);
        }
    }

    verifyBlockUser(request: Request, email: string) {
        const userToCheck = this.obtainIpWithEmail(
            request.headers["x-forwarded-for"].toString(),
            email
        );
        if (!this.usersService.usersBlocked.get(userToCheck)) {
            let userBlocked: UserBlocked = {
                firstAttempt: 0,
                until: 0,
                attempts: 0,
            };
            this.usersService.usersBlocked.set(userToCheck, userBlocked);
        }
        const timeBanned =
            this.usersService.usersBlocked.get(userToCheck).until;
        return timeBanned > new Date().getTime();
    }

    obtainSecondsBanned(request: Request, email: string): number {
        const userToCheck = this.obtainIpWithEmail(
            request.headers["x-forwarded-for"].toString(),
            email
        );
        const userBlocked = this.usersService.usersBlocked.get(userToCheck);
        const untilTimestamp = userBlocked.until;
        return Math.round((untilTimestamp - new Date().getTime()) / 1000);
    }

    obtainIpWithEmail(ip: string, email: string): string {
        let value = "{IP}[{EMAIL}]";
        return value.replace("{IP}", ip).replace("{EMAIL}", email);
    }

    createCodeEmail() {
        let code: CodeEmail = {
            code: uuidv4(),
            expiration: new Date().getTime() + 3600000, //1h expiration
        };

        return code;
    }

    checkCodeEmail(code: CodeEmail) {
        return new Date().getTime() <= code.expiration;
    }

    @UseGuards(ThrottlerGuard)
    @Throttle(100, 30)
    @ApiOkResponse()
    @Post("checkout")
    @UseGuards(AuthenticatedGuard)
    async checkout(
        @Body() payload: CheckoutDto,
        @Res({passthrough: true}) response: Response,
        @Req() request: Request
    ) {
        let user: User = await this.usersService.obtainUserLogged(request);
        let productsId = payload.products;

        let productsToBuy: Product[] = await this.productsService.getRepository().createQueryBuilder('product')
        .leftJoinAndSelect('product.user', 'user') // Realiza un left join con la entidad User y establece el alias "user"
        .where('product.id IN (:...productsId)', { productsId })
        .getMany();

        let totalPrice: number = productsToBuy.reduce((acc: number, item) => {
            const itemPrice = parseFloat(item.price);
            return acc + itemPrice;
        }, 0);

        if (user.coins < totalPrice) {
            response
                .status(400)
                .json({message: ["coins_not_available"], formError: "coins"});
            this.logger.info(
                "Fail Checkout (coins_not_available) {IP}".replace(
                    "{IP}",
                    request.headers["x-forwarded-for"].toString()
                )
            );
            return;
        }

        user.coins -= totalPrice;
        
        if (await this.usersService.save(user)) {
            response.status(200).json({
                message: ["successfully_checkout"],
                coins: user.coins
            });
        }

        let invoice: Invoice = new Invoice;
        invoice.buyer = user;
        invoice.price = totalPrice.toString();
        invoice.items = [];
        invoice = plainToClass(Invoice, await this.invoicesService.save(invoice));


        let invoiceItems: InvoiceItem[] = [];
        for(const product of productsToBuy) {
            let invoiceItem: InvoiceItem = new InvoiceItem;
            invoiceItem.product = product;
            invoiceItem.invoice = invoice;
            invoiceItems.push(invoiceItem);
        }

        invoiceItems = plainToClass(InvoiceItem, await this.invoiceItemsService.saveMany(invoiceItems));
        invoice.items = invoiceItems;
        this.invoicesService.save(invoice);

        this.logger.info(
            "Checkout: {INVOICE}".replace("{INVOICE}", JSON.stringify(invoice))
        );

        await lastValueFrom(
            this.httpService.post(
                `http://${process.env.MAILER_CONTAINER_NAME}:${process.env.MAILER_CONTAINER_PORT}/mailer/sendInvoice`,
                {invoice: invoice},
                {
                    headers: {"content-type": "application/json"},
                }
            )
        );

        let sellers: Map<string, User> = new Map();

        for(const seller of invoice.items.map(i => i.product.user)) {
            sellers.set(seller.id, seller);
        }

        for(const seller of sellers) {
            let invoiceCopy = JSON.parse(JSON.stringify(invoice));
            let invoiceItems: InvoiceItem[] = [];
            invoiceCopy.items.filter(i => i.product.user.id === seller[0]).forEach(item => invoiceItems.push(item));
            invoiceCopy.items = invoiceItems;
            await lastValueFrom(
                this.httpService.post(
                    `http://${process.env.MAILER_CONTAINER_NAME}:${process.env.MAILER_CONTAINER_PORT}/mailer/sendInvoiceSeller`,
                    {invoice: invoiceCopy},
                    {
                        headers: {"content-type": "application/json"},
                    }
                )
            );
        }
    }
}
