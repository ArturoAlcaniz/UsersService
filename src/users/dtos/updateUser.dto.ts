import {PartialType} from "@nestjs/mapped-types";
import {CreateUserDto} from "../../../../entities-lib/src/requests/createUser.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {}
