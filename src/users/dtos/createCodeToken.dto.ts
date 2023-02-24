import { IsDecimal, IsNotEmpty, IsNumber, IsNumberString, isNumberString, IsString } from "class-validator";

export class CreateCodeTokenDto {
    @IsNotEmpty()
    readonly id: string;

    @IsNotEmpty()
    @IsDecimal()
    readonly coins: string;

    @IsString()
    readonly starts: string;

    @IsString()
    readonly ends: string;

    @IsNumberString()
    readonly amount: string;
}