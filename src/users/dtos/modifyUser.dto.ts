import { Type } from "class-transformer";
import {IsEmail, IsNotEmpty, IsOptional, IsString} from "class-validator";

export class ModifyUserDto {
    @IsNotEmpty()
    @IsString()
    readonly username: string;

    @IsNotEmpty()
    @IsString()
    @IsEmail()
    readonly email: string;

    @IsString()
    readonly newPass: string;

    @IsString()
    readonly pass: string;

    @IsOptional()
    @Type(() => require('express').Multer.File)
    readonly avatar?: Express.Multer.File;
}
