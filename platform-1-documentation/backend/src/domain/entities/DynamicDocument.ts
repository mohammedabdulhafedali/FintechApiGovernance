export type DocLifecycleStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED';

export type EditabilityPolicy = 'CUSTOMIZABLE' | 'RESTRICTED' | 'LOCKED';

export interface DocumentSection {
  id: string;
  type: 'header' | 'api-overview' | 'endpoint' | 'fields-table' | 'code-block' | 'callout' | 'custom-text';
  title?: string;
  data: {
    title?: string;
    subtitle?: string;
    description?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path?: string;
    headers?: Array<{ name: string; type: string; required: boolean; description: string; example?: string }>;
    parameters?: Array<{ name: string; type: string; required: boolean; description: string; example?: string }>;
    requestBody?: string;
    responseBody?: string;
    calloutType?: 'info' | 'warning' | 'success' | 'danger';
    content?: string;
  };
}

export interface SharedDesignTokens {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  baseFontSize: number;
  borderRadius: number;
}

export interface WebModeSettings {
  policy: EditabilityPolicy;
  layoutType: 'STRUCTURED_FLOW' | 'COMPACT_CARDS';
  showSidebarNav: boolean;
  collapsibleSections: boolean;
  enableInteractiveTesting: boolean;
}

export interface PrintA4Settings {
  policy: EditabilityPolicy;
  layoutType: 'PAGINATED_PAGE';
  pageSize: 'A4' | 'A3' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  marginsMm: { top: number; bottom: number; left: number; right: number };
  headerText: string;
  footerText: string;
  showPageNumbers: boolean;
  repeatTableHeaders: boolean;
  showOfficialWatermark: boolean;
}

export interface RenderModesConfig {
  web: WebModeSettings;
  print_a4: PrintA4Settings;
  [key: string]: any;
}

export interface DynamicDocument {
  id: string;
  title: string;
  slug: string;
  systemKey?: string;
  integrationKey?: string;
  version: string;
  status: DocLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  sections: DocumentSection[];
  sharedTokens: SharedDesignTokens;
  renderModes: RenderModesConfig;
  modeOverrides?: Record<string, Partial<SharedDesignTokens>>;
  history?: Array<{
    version: string;
    status: DocLifecycleStatus;
    changedAt: string;
    changedBy: string;
    comment: string;
  }>;
}
