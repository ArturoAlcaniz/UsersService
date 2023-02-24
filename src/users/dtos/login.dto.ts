import {IsNotEmpty, IsString, IsEmail} from "class-validator";

export class LoginDto {
    @IsNotEmpty({message: "email_empty"})
    @IsString()
    @IsEmail({}, {message: "invalid_email"})
    readonly email: string;

    @IsNotEmpty({message: "pass_empty"})
    @IsString()
    readonly pass: string;
}
