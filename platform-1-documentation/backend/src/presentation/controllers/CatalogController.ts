import { Request, Response } from 'express';
import { GetCatalogUseCase } from '../../application/usecases/GetCatalogUseCase.js';
import { GetSectorEndpointsUseCase } from '../../application/usecases/GetSectorEndpointsUseCase.js';
import { CreateEndpointUseCase } from '../../application/usecases/CreateEndpointUseCase.js';
import { CreateSectorUseCase } from '../../application/usecases/CreateSectorUseCase.js';
import { DeleteSectorUseCase } from '../../application/usecases/DeleteSectorUseCase.js';

export class CatalogController {
  constructor(
    private readonly getCatalogUseCase: GetCatalogUseCase,
    private readonly getSectorEndpointsUseCase: GetSectorEndpointsUseCase,
    private readonly createEndpointUseCase: CreateEndpointUseCase,
    private readonly createSectorUseCase: CreateSectorUseCase,
    private readonly deleteSectorUseCase: DeleteSectorUseCase
  ) {}

  getCatalog = async (_req: Request, res: Response): Promise<void> => {
    try {
      const catalog = await this.getCatalogUseCase.execute();
      res.status(200).json({
        success: true,
        data: catalog,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error'
      });
    }
  };

  getSectorEndpoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const sectorKey = String(req.params.sectorKey);
      const endpoints = await this.getSectorEndpointsUseCase.execute(sectorKey);
      res.status(200).json({
        success: true,
        data: endpoints,
        count: endpoints.length
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error'
      });
    }
  };

  createEndpoint = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await this.createEndpointUseCase.execute(req.body);
      res.status(201).json({
        success: true,
        data: created,
        message: 'Endpoint created / updated successfully'
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Bad Request'
      });
    }
  };

  createSector = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await this.createSectorUseCase.execute(req.body);
      res.status(201).json({
        success: true,
        data: created,
        message: 'Sector created successfully'
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Bad Request'
      });
    }
  };

  deleteSector = async (req: Request, res: Response): Promise<void> => {
    try {
      const sectorKey = String(req.params.sectorKey);
      const success = await this.deleteSectorUseCase.execute(sectorKey);
      res.status(200).json({
        success,
        message: `Sector "${sectorKey}" deleted successfully`
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Bad Request'
      });
    }
  };
}
