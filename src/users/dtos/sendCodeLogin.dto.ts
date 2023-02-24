import {IsNotEmpty, IsString} from "class-validator";

export class SendCodeLoginDto {
    @IsNotEmpty({message: "code_empty"})
    @IsString()
    readonly code: string;
}
