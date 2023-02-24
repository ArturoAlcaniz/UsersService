import {Module} from "@nestjs/common";
import {CustomHashing} from "./hashing.service";

@Module({
    providers: [CustomHashing],
    exports: [CustomHashing],
})
export class HashingModule {}
