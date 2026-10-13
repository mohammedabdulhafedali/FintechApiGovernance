import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { ManageUsersUseCase } from '../../application/usecases/iam/ManageUsersUseCase.js';
import { ManageGroupsUseCase } from '../../application/usecases/iam/ManageGroupsUseCase.js';
import { GetAuditLogsUseCase } from '../../application/usecases/iam/GetAuditLogsUseCase.js';

import { DynamicSystemPermissionService } from '../../application/services/DynamicSystemPermissionService.js';

export class IamController {
  constructor(
    private readonly manageUsersUseCase: ManageUsersUseCase,
    private readonly manageGroupsUseCase: ManageGroupsUseCase,
    private readonly getAuditLogsUseCase: GetAuditLogsUseCase,
    private readonly dynamicPermissionService?: DynamicSystemPermissionService
  ) {}

  // --- Users ---
  getUsers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const users = await this.manageUsersUseCase.getAllUsers();
      res.status(200).json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const actor = req.user?.username || 'system';
      const created = await this.manageUsersUseCase.createUser(req.body, actor);
      res.status(201).json({ success: true, user: created });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  updateUserOverrides = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { overrides } = req.body;
      const actor = req.user?.username || 'system';
      const updated = await this.manageUsersUseCase.updateUserOverrides(id, overrides, actor);
      res.status(200).json({ success: true, user: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  updateUserScope = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actor = req.user?.username || 'system';
      const updated = await this.manageUsersUseCase.updateUserScope(id, req.body, actor);
      res.status(200).json({ success: true, user: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  updateUserGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { groupId } = req.body;
      const actor = req.user?.username || 'system';
      const updated = await this.manageUsersUseCase.updateUserGroup(id, groupId, actor);
      res.status(200).json({ success: true, user: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  toggleUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { status } = req.body;
      const actor = req.user?.username || 'system';
      await this.manageUsersUseCase.toggleUserStatus(id, status, actor);
      res.status(200).json({ success: true, message: `تم تحديث حالة المستخدم بنجاح` });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // --- Groups ---
  getGroups = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const groups = await this.manageGroupsUseCase.getAllGroups();
      res.status(200).json({ success: true, groups });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  createGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const actor = req.user?.username || 'system';
      const created = await this.manageGroupsUseCase.createGroup(req.body, actor);
      res.status(201).json({ success: true, group: created });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  updateGroupPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { permissions } = req.body;
      const actor = req.user?.username || 'system';
      const updated = await this.manageGroupsUseCase.updateGroupPermissions(id, permissions, actor);
      res.status(200).json({ success: true, group: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // --- Resources Catalog (Dynamic Screens) ---
  getResources = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (this.dynamicPermissionService) {
        const dynamicResources = await this.dynamicPermissionService.getSystemScreenResources();
        res.status(200).json({ success: true, resources: dynamicResources });
        return;
      }
      const { SCREEN_RESOURCES_CATALOG } = await import('../../domain/entities/ResourceCatalog.js');
      res.status(200).json({ success: true, resources: SCREEN_RESOURCES_CATALOG });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  updateGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actor = req.user?.username || 'system';
      const updated = await this.manageGroupsUseCase.updateGroup(id, req.body, actor);
      res.status(200).json({ success: true, group: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  deleteGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actor = req.user?.username || 'system';
      await this.manageGroupsUseCase.deleteGroup(id, actor);
      res.status(200).json({ success: true, message: 'تم حذف المجموعة بنجاح' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // --- Audit Logs ---
  getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await this.getAuditLogsUseCase.execute(limit);
      res.status(200).json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}
