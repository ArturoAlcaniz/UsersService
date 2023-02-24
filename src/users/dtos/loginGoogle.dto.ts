import {IsNotEmpty, IsString} from "class-validator";

export class LoginGoogleDto {
    @IsNotEmpty({message: "token_empty"})
    @IsString()
    readonly token: string;
}
