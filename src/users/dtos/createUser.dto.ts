import {IsEmail, IsNotEmpty, IsString} from "class-validator";

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    readonly code: string;
}
