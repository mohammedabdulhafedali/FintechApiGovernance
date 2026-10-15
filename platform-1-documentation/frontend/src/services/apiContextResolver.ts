import { Endpoint, SystemIntegration, SystemModule, Sector } from '../types/schema';

export interface ApiContextInput {
  activeView: string;
  activeEndpoint?: Endpoint | null;
  activeIntegration?: SystemIntegration | null;
  activeSystem?: SystemModule | null;
  activeSector?: Sector | null;
  currentVersion?: string;
  isRtl?: boolean;
}

export interface ReleaseVersionItem {
  value: string;
  shortLabel: string;
  badge: string;
}

export interface ApiContextState {
  isOpen: boolean;
  baseUrl: string;
  displayUrl: string;
  version: string;
  shortVersion: string;
  versionBadge?: string;
  availableVersions: ReleaseVersionItem[];
}

export interface IApiContextStrategy {
  canHandle(input: ApiContextInput): boolean;
  resolve(input: ApiContextInput): ApiContextState;
}

/**
 * Strategy 1: Endpoint & Sector Documentation Context
 * Resolves dynamic Base URL and Version when an endpoint/path is active.
 */
export class EndpointContextStrategy implements IApiContextStrategy {
  canHandle(input: ApiContextInput): boolean {
    return (
      input.activeView === 'sector-spec' &&
      Boolean(input.activeEndpoint && input.activeEndpoint.path)
    );
  }

  resolve(input: ApiContextInput): ApiContextState {
    const isRtl = Boolean(input.isRtl);
    const endpoint = input.activeEndpoint!;
    const integration = input.activeIntegration;
    const sector = input.activeSector;

    // 1. Resolve Dynamic Base URL
    let fullBaseUrl = '';

    // A. Check integration baseUrl if explicitly defined
    if (integration && (integration as any).baseUrl) {
      fullBaseUrl = (integration as any).baseUrl;
    }

    // B. Check endpoint curl for actual host and base path
    if (!fullBaseUrl && endpoint.curl) {
      const urlMatch = endpoint.curl.match(/https?:\/\/[^\s"'\\]+/i);
      if (urlMatch) {
        const matchedUrl = urlMatch[0];
        try {
          const parsed = new URL(matchedUrl);
          // If the endpoint path is at the end, strip it to leave the base URL
          const endpointPath = endpoint.path.replace(/\{[^}]+\}/g, '').replace(/\/+$/, '');
          let pathname = parsed.pathname.replace(/\/+$/, '');
          
          if (endpointPath && pathname.endsWith(endpointPath)) {
            pathname = pathname.slice(0, -endpointPath.length).replace(/\/+$/, '');
          }
          fullBaseUrl = `${parsed.origin}${pathname}`;
        } catch {
          // If URL parsing fails, extract origin
          const hostMatch = matchedUrl.match(/^(https?:\/\/[^\/]+)/i);
          if (hostMatch) fullBaseUrl = hostMatch[1];
        }
      }
    }

    // C. Check sector core service baseUrl
    if (!fullBaseUrl && sector?.services?.core?.baseUrl) {
      fullBaseUrl = sector.services.core.baseUrl;
    }

    // D. Fallback based on path version
    if (!fullBaseUrl) {
      const vMatch = endpoint.path.match(/^\/(v\d+)/i);
      fullBaseUrl = vMatch ? `https://api.gov.fintech/${vMatch[1]}` : 'https://api.gov.fintech';
    }

    // Clean display URL (e.g. "api.gov.fintech/v1/ips" without https://)
    const displayUrl = fullBaseUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

    // 2. Resolve Dynamic Version
    const defaultReleases: ReleaseVersionItem[] = [
      { value: 'v2026.2', shortLabel: 'v2026.2', badge: isRtl ? 'معتمد' : 'Official' },
      { value: 'v2026.1', shortLabel: 'v2026.1', badge: isRtl ? 'مؤرشف' : 'Archived' },
      { value: 'v2027.0-draft', shortLabel: 'v2027.0', badge: isRtl ? 'مسودة' : 'Draft' },
    ];

    let activeVersion = input.currentVersion || 'v2026.2';
    let shortVersion = activeVersion;
    let versionBadge = isRtl ? 'معتمد' : 'Official';

    if (integration?.docVersion) {
      activeVersion = integration.docVersion;
      shortVersion = activeVersion.startsWith('v') ? activeVersion : `v${activeVersion}`;
    } else if (endpoint.releaseId) {
      activeVersion = endpoint.releaseId;
      shortVersion = activeVersion;
    }

    return {
      isOpen: true,
      baseUrl: fullBaseUrl,
      displayUrl,
      version: activeVersion,
      shortVersion,
      versionBadge,
      availableVersions: defaultReleases
    };
  }
}

/**
 * Strategy 2: Default Closed Context
 * When on Dashboard, IAM, Governance or any view without an active path/file.
 */
export class ClosedContextStrategy implements IApiContextStrategy {
  canHandle(_input: ApiContextInput): boolean {
    return true; // Catch-all fallback
  }

  resolve(_input: ApiContextInput): ApiContextState {
    return {
      isOpen: false,
      baseUrl: '',
      displayUrl: '',
      version: '',
      shortVersion: '',
      availableVersions: []
    };
  }
}

/**
 * Composite Resolver (SOLID: Open/Closed & Single Responsibility)
 */
export class ApiContextResolver {
  private strategies: IApiContextStrategy[];

  constructor(strategies?: IApiContextStrategy[]) {
    this.strategies = strategies || [
      new EndpointContextStrategy(),
      new ClosedContextStrategy()
    ];
  }

  public registerStrategy(strategy: IApiContextStrategy): void {
    this.strategies.unshift(strategy);
  }

  public resolve(input: ApiContextInput): ApiContextState {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(input)) {
        return strategy.resolve(input);
      }
    }
    return new ClosedContextStrategy().resolve(input);
  }
}

export const apiContextResolver = new ApiContextResolver();
