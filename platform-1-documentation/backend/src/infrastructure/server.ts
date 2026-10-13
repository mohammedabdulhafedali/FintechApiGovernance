import express from 'express';
import cors from 'cors';
import { FileSectorRepository } from './repositories/FileSectorRepository.js';
import { FileUserRepository } from './repositories/FileUserRepository.js';
import { FileUserGroupRepository } from './repositories/FileUserGroupRepository.js';
import { FileAuditLogRepository } from './repositories/FileAuditLogRepository.js';
import { FileGovernanceRepository } from './repositories/FileGovernanceRepository.js';

import { CryptoPasswordHasher } from './security/CryptoPasswordHasher.js';
import { JwtTokenService } from './security/JwtTokenService.js';
import { PermissionEvaluator } from './security/PermissionEvaluator.js';

import { AuthenticateUserUseCase } from '../application/usecases/iam/AuthenticateUserUseCase.js';
import { ManageUsersUseCase } from '../application/usecases/iam/ManageUsersUseCase.js';
import { ManageGroupsUseCase } from '../application/usecases/iam/ManageGroupsUseCase.js';
import { GetAuditLogsUseCase } from '../application/usecases/iam/GetAuditLogsUseCase.js';

import { GetCatalogUseCase } from '../application/usecases/GetCatalogUseCase.js';
import { GetSectorEndpointsUseCase } from '../application/usecases/GetSectorEndpointsUseCase.js';
import { CreateEndpointUseCase } from '../application/usecases/CreateEndpointUseCase.js';
import { CreateSectorUseCase } from '../application/usecases/CreateSectorUseCase.js';
import { DeleteSectorUseCase } from '../application/usecases/DeleteSectorUseCase.js';

import { ActionRegistry } from '../application/governance/ActionRegistry.js';
import { GovernanceWorkflowService } from '../application/governance/GovernanceWorkflowService.js';
import { DynamicSystemPermissionService } from '../application/services/DynamicSystemPermissionService.js';

import { createAuthMiddleware } from '../presentation/middlewares/authMiddleware.js';
import { createRequirePermissionMiddleware } from '../presentation/middlewares/requirePermissionMiddleware.js';

import { CatalogController } from '../presentation/controllers/CatalogController.js';
import { AuthController } from '../presentation/controllers/AuthController.js';
import { IamController } from '../presentation/controllers/IamController.js';
import { GovernanceWorkflowController } from '../presentation/controllers/GovernanceWorkflowController.js';

import { createCatalogRouter } from '../presentation/routes/catalogRoutes.js';
import { createAuthRouter } from '../presentation/routes/authRoutes.js';
import { createIamRouter } from '../presentation/routes/iamRoutes.js';
import { createGovernanceRouter } from '../presentation/routes/governanceRoutes.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));

  // Composition Root: Dependency Injection adhering to SOLID Principles
  // 1. Repositories
  const sectorRepository = new FileSectorRepository();
  const userRepository = new FileUserRepository();
  const userGroupRepository = new FileUserGroupRepository();
  const auditLogRepository = new FileAuditLogRepository();
  const governanceRepository = new FileGovernanceRepository();

  // 2. Security Infrastructure Services
  const passwordHasher = new CryptoPasswordHasher();
  const tokenService = new JwtTokenService();
  const permissionEvaluator = new PermissionEvaluator();

  // 3. Middlewares
  const authMiddleware = createAuthMiddleware(tokenService);
  const requirePermission = createRequirePermissionMiddleware(
    permissionEvaluator,
    auditLogRepository
  );

  // 4. Action Registry & Governance Handlers (SOLID OCP & LSP)
  const actionRegistry = new ActionRegistry();

  // Register execution handlers for actions after full approval
  actionRegistry.register({
    resourceKey: 'catalog:endpoints',
    actionType: 'CREATE',
    execute: async (payload) => {
      const sectorKey = payload.sectorKey || 'payments';
      await sectorRepository.addOrUpdateEndpoint(sectorKey, payload);
      return { success: true };
    }
  });

  actionRegistry.register({
    resourceKey: 'catalog:sectors',
    actionType: 'CREATE',
    execute: async (payload) => {
      const key = payload.key || payload.code?.toLowerCase() || 'new-sector';
      await sectorRepository.saveSector(key, payload);
      return { success: true };
    }
  });

  actionRegistry.register({
    resourceKey: 'catalog:sectors',
    actionType: 'DELETE',
    execute: async (_payload, targetResourceId) => {
      if (targetResourceId) {
        await sectorRepository.deleteSector(targetResourceId);
      }
      return { success: true };
    }
  });

  actionRegistry.register({
    resourceKey: 'iam:groups',
    actionType: 'UPDATE',
    execute: async (payload, targetResourceId) => {
      if (targetResourceId) {
        const group = await userGroupRepository.findById(targetResourceId);
        if (group) {
          group.permissions = payload.permissions || group.permissions;
          await userGroupRepository.update(group);
        }
      }
      return { success: true };
    }
  });

  actionRegistry.register({
    resourceKey: 'iam:groups',
    actionType: 'DELETE',
    execute: async (_payload, targetResourceId) => {
      if (targetResourceId) {
        await userGroupRepository.delete(targetResourceId);
      }
      return { success: true };
    }
  });

  // 5. Governance Workflow Service
  const governanceService = new GovernanceWorkflowService(governanceRepository, actionRegistry);

  // 6. IAM Use Cases
  const authenticateUserUseCase = new AuthenticateUserUseCase(
    userRepository,
    userGroupRepository,
    passwordHasher,
    tokenService,
    permissionEvaluator,
    auditLogRepository
  );

  const manageUsersUseCase = new ManageUsersUseCase(
    userRepository,
    userGroupRepository,
    passwordHasher,
    permissionEvaluator,
    auditLogRepository
  );

  const manageGroupsUseCase = new ManageGroupsUseCase(
    userGroupRepository,
    auditLogRepository
  );

  const getAuditLogsUseCase = new GetAuditLogsUseCase(auditLogRepository);

  // 7. Catalog Use Cases
  const getCatalogUseCase = new GetCatalogUseCase(sectorRepository);
  const getSectorEndpointsUseCase = new GetSectorEndpointsUseCase(sectorRepository);
  const createEndpointUseCase = new CreateEndpointUseCase(sectorRepository);
  const createSectorUseCase = new CreateSectorUseCase(sectorRepository);
  const deleteSectorUseCase = new DeleteSectorUseCase(sectorRepository);

  // 8. Dynamic Permission Discovery Engine
  const dynamicPermissionService = new DynamicSystemPermissionService(sectorRepository);

  // 9. Controllers
  const authController = new AuthController(
    authenticateUserUseCase,
    userRepository,
    userGroupRepository,
    permissionEvaluator,
    dynamicPermissionService
  );

  const iamController = new IamController(
    manageUsersUseCase,
    manageGroupsUseCase,
    getAuditLogsUseCase,
    dynamicPermissionService
  );

  const catalogController = new CatalogController(
    getCatalogUseCase,
    getSectorEndpointsUseCase,
    createEndpointUseCase,
    createSectorUseCase,
    deleteSectorUseCase
  );

  const governanceController = new GovernanceWorkflowController(governanceService);

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      service: 'fintech-api-governance-backend',
      architecture: 'Clean Hexagonal + Dynamic Approval Pipelines & Maker-Checker Engine (SOLID)',
      timestamp: new Date().toISOString()
    });
  });

  // Mount Routers
  app.use('/api/v1/auth', createAuthRouter(authController, authMiddleware));
  app.use('/api/v1/iam', createIamRouter(iamController, authMiddleware, requirePermission, governanceService));
  app.use(
    '/api/v1',
    createCatalogRouter(catalogController, authMiddleware, requirePermission, governanceService)
  );
  app.use('/api/v1/governance', createGovernanceRouter(governanceController, authMiddleware));

  return app;
}

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[FinTech Governance Backend] Sovereign Server listening on http://localhost:${PORT}`);
    console.log(`[Health Endpoint] http://localhost:${PORT}/health`);
    console.log(`[Governance Hub] http://localhost:${PORT}/api/v1/governance/inbox`);
    console.log(`[Auth Endpoint] http://localhost:${PORT}/api/v1/auth/login`);
    console.log(`[IAM Endpoint] http://localhost:${PORT}/api/v1/iam`);
    console.log(`[Catalog Endpoint] http://localhost:${PORT}/api/v1/catalog`);
  });
}
