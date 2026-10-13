import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { Endpoint, HttpMethod } from '../../domain/entities/Endpoint.js';

export interface CreateEndpointDTO {
  sectorKey: string;
  serviceKey?: string;
  path: string;
  method: HttpMethod;
  summary: string;
  description: string;
  shortName?: string;
  parameters?: any[];
  requestPayload?: string;
  responsePayload: string;
}

export class CreateEndpointUseCase {
  constructor(private readonly sectorRepository: ISectorRepository) {}

  async execute(dto: CreateEndpointDTO): Promise<Endpoint> {
    if (!dto.sectorKey) {
      throw new Error('sectorKey is required');
    }
    if (!dto.path || !dto.path.startsWith('/')) {
      throw new Error('Endpoint path must start with "/"');
    }
    if (!dto.method) {
      throw new Error('HTTP Method is required');
    }

    const endpoint: Endpoint = {
      id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      path: dto.path,
      method: dto.method,
      summary: dto.summary || '',
      description: dto.description || '',
      shortName: dto.shortName || dto.path.split('/').filter(Boolean).pop(),
      parameters: dto.parameters || [],
      requestPayload: dto.requestPayload || '',
      responsePayload: dto.responsePayload || '{\n  "status": "SUCCESS"\n}'
    };

    return this.sectorRepository.addOrUpdateEndpoint(dto.sectorKey, endpoint, dto.serviceKey);
  }
}
