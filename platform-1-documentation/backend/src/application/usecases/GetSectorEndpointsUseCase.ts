import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { Endpoint } from '../../domain/entities/Endpoint.js';

export class GetSectorEndpointsUseCase {
  constructor(private readonly sectorRepository: ISectorRepository) {}

  async execute(sectorKey: string): Promise<Endpoint[]> {
    const sector = await this.sectorRepository.getSectorByKey(sectorKey);
    if (!sector || !sector.services) {
      return [];
    }

    const endpoints: Endpoint[] = [];
    for (const service of Object.values(sector.services)) {
      if (service.endpoints && Array.isArray(service.endpoints)) {
        endpoints.push(...service.endpoints);
      }
    }
    return endpoints;
  }
}
