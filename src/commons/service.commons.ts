import {DeepPartial, DeleteResult, FindManyOptions, Repository} from "typeorm";

export abstract class BaseService<T> {
    abstract getRepository(): Repository<T>;
    
    find(id: any): Promise<T[]> {
        return this.getRepository().find(id);
    }

    findAll(): Promise<T[]> {
        return this.getRepository().find();
    }

    findOne(id: any): Promise<T> {
        return this.getRepository().findOne(id);
    }

    save(entity: DeepPartial<T>): Promise<DeepPartial<T>> {
        return this.getRepository().save(entity);
    }

    saveMany(entities: DeepPartial<T[]>): Promise<DeepPartial<T[]>> {
        return this.getRepository().save(entities);
    }

    remove(entity: any): any {
        return this.getRepository().remove(entity);
    }

    async delete(id: any): Promise<DeleteResult> {
        return await this.getRepository().delete(id);
    }

    async deleteMany(ids: any[]): Promise<DeleteResult> {
        return await this.getRepository().delete(ids);
    }

    count(options?: FindManyOptions<T>): Promise<number> {
        return this.getRepository().count(options);
    }
}
