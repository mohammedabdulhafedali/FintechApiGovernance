export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface Parameter {
  name: string;
  in: 'header' | 'query' | 'path' | 'body';
  required: boolean;
  type: string;
  description: string;
  example?: string;
}

export interface SecurityScheme {
  type: 'OAuth2' | 'APIKey' | 'Mutual-TLS' | 'JWT';
  description?: string;
  scopes?: string[];
}

export interface Endpoint {
  id?: string;
  path: string;
  method: HttpMethod;
  summary: string;
  description: string;
  shortName?: string;
  isDraft?: boolean;
  complianceClassification?: string[];
  parameters: Parameter[];
  requestPayload?: string;
  responsePayload: string;
  security?: SecurityScheme[];
}
