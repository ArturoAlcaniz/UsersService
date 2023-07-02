import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {BaseService} from "@commons/service.commons";
import {Invoice} from "@entities-lib/src/entities/invoice.entity";


@Injectable()
export class InvoicesService extends BaseService<Invoice> {
    constructor(
        @InjectRepository(Invoice)
        private invoiceRepository: Repository<Invoice>
     ) {
        super()
    }

    getRepository(): Repository<Invoice> {
        return this.invoiceRepository;
    }
}
