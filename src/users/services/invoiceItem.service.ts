import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {BaseService} from "@commons/service.commons";
import {InvoiceItem} from "@entities-lib/src/entities/invoiceItem.entity";


@Injectable()
export class InvoiceItemsService extends BaseService<InvoiceItem> {
    constructor(
        @InjectRepository(InvoiceItem)
        private invoiceItemRepository: Repository<InvoiceItem>
     ) {
        super()
    }

    getRepository(): Repository<InvoiceItem> {
        return this.invoiceItemRepository;
    }
}
