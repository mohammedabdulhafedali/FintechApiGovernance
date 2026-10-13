import express from 'express';
import cors from 'cors';
import { FileSectorRepository } from './repositories/FileSectorRepository.js';
import { GetCatalogUseCase } from '../application/usecases/GetCatalogUseCase.js';
import { GetSectorEndpointsUseCase } from '../application/usecases/GetSectorEndpointsUseCase.js';
import { CreateEndpointUseCase } from '../application/usecases/CreateEndpointUseCase.js';
import { CreateSectorUseCase } from '../application/usecases/CreateSectorUseCase.js';
import { DeleteSectorUseCase } from '../application/usecases/DeleteSectorUseCase.js';
import { CatalogController } from '../presentation/controllers/CatalogController.js';
import { createCatalogRouter } from '../presentation/routes/catalogRoutes.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }));
  app.use(express.json({ limit: '10mb' }));

  // Composition Root: Dependency Injection adhering to Dependency Inversion Principle
  const sectorRepository = new FileSectorRepository();

  const getCatalogUseCase = new GetCatalogUseCase(sectorRepository);
  const getSectorEndpointsUseCase = new GetSectorEndpointsUseCase(sectorRepository);
  const createEndpointUseCase = new CreateEndpointUseCase(sectorRepository);
  const createSectorUseCase = new CreateSectorUseCase(sectorRepository);
  const deleteSectorUseCase = new DeleteSectorUseCase(sectorRepository);

  const catalogController = new CatalogController(
    getCatalogUseCase,
    getSectorEndpointsUseCase,
    createEndpointUseCase,
    createSectorUseCase,
    deleteSectorUseCase
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      service: 'fintech-api-governance-backend',
      architecture: 'Clean / SOLID Hexagonal',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API v1 router
  app.use('/api/v1', createCatalogRouter(catalogController));

  return app;
}

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[FinTech Governance Backend] Sovereign Server listening on http://localhost:${PORT}`);
    console.log(`[Health Endpoint] http://localhost:${PORT}/health`);
    console.log(`[Catalog Endpoint] http://localhost:${PORT}/api/v1/catalog`);
  });
}
