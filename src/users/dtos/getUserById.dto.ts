import {IsNotEmpty, IsString} from "class-validator";

export class GetUserByIdDto {
    @IsNotEmpty()
    @IsString()
    readonly userId: string;
}
