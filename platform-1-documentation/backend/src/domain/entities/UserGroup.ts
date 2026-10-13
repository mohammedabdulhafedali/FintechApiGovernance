import { ResourceScope, UserType } from './User.js';

export interface UserGroup {
  id: string;
  key: string;
  name: string;
  description?: string;
  permissions: string[];
  groupType?: UserType;
  defaultScope?: ResourceScope;
  status?: 'ACTIVE' | 'INACTIVE';
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

