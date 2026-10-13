import { UserGroup } from '../entities/UserGroup.js';

export interface IUserGroupRepository {
  findById(id: string): Promise<UserGroup | null>;
  findByKey(key: string): Promise<UserGroup | null>;
  findAll(): Promise<UserGroup[]>;
  save(group: UserGroup): Promise<UserGroup>;
  update(group: UserGroup): Promise<UserGroup>;
  delete(id: string): Promise<boolean>;
}
