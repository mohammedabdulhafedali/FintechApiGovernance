import { Request, Response } from 'express';
import { DynamicDocUseCases } from '../../application/usecases/dynamic-docs/DynamicDocUseCases.js';

export class DynamicDocController {
  constructor(private readonly useCases: DynamicDocUseCases) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const list = await this.useCases.getAll();
      res.status(200).json({ success: true, count: list.length, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const doc = await this.useCases.getById(String(req.params.id));
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      res.status(200).json({ success: true, data: doc });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user || { id: 'usr_admin', fullName: 'محرر المنظومة', email: 'admin@gov.fintech' };
      const doc = await this.useCases.create(req.body, {
        id: user.id,
        name: user.fullName || user.username || 'محرر المنظومة',
        email: user.email || 'user@gov.fintech'
      });
      res.status(201).json({ success: true, message: 'Document created successfully', data: doc });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user || { fullName: 'محرر المنظومة' };
      const updated = await this.useCases.update(String(req.params.id), req.body, {
        name: user.fullName || user.username || 'محرر المنظومة'
      });
      res.status(200).json({ success: true, message: 'Document updated successfully', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  publish = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user || { fullName: 'معتمد المنظومة' };
      const published = await this.useCases.publish(
        String(req.params.id),
        { name: user.fullName || user.username || 'معتمد المنظومة' },
        req.body?.comment
      );
      res.status(200).json({ success: true, message: 'Document published successfully', data: published });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const ok = await this.useCases.delete(String(req.params.id));
      if (!ok) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      res.status(200).json({ success: true, message: 'Document deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}
