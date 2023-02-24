import { IsDecimal, IsNotEmpty, IsNumber, IsNumberString, isNumberString, IsString } from "class-validator";

export class RedeemCodeTokenDto {
    @IsNotEmpty()
    readonly id: string;
}