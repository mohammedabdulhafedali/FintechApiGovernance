import { Router } from 'express';
import { CatalogController } from '../controllers/CatalogController.js';

export function createCatalogRouter(controller: CatalogController): Router {
  const router = Router();

  // GET /api/v1/catalog
  router.get('/catalog', controller.getCatalog);

  // GET /api/v1/sectors/:sectorKey/endpoints
  router.get('/sectors/:sectorKey/endpoints', controller.getSectorEndpoints);

  // POST /api/v1/endpoints
  router.post('/endpoints', controller.createEndpoint);

  // POST /api/v1/sectors
  router.post('/sectors', controller.createSector);

  // DELETE /api/v1/sectors/:sectorKey
  router.delete('/sectors/:sectorKey', controller.deleteSector);

  return router;
}
