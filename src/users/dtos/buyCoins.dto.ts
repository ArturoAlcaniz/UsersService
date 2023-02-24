import {IsNotEmpty, IsString} from "class-validator";

export class BuyCoinsDto {
    @IsNotEmpty({message: "id_empty"})
    @IsString()
    readonly id: string;
}
