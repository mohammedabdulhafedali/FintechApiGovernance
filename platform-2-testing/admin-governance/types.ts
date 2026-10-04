export interface TestExecutionPolicy {
  maxConcurrentTests: number;
  allowedEnvironments: ('SANDBOX' | 'SIMULATOR' | 'STAGING')[];
  requireAuthToken: boolean;
  rateLimitPerMinute: number;
}

export interface MockDataRule {
  forbidRealPAN: boolean;
  forbidRealIBAN: boolean;
  syntheticDataGenerationOnly: boolean;
  allowedCurrencies: string[];
}

export interface ComplianceValidationRule {
  minimumPassPercentage: number;
  mandatoryRuleCodes: string[];
  signOffRequiredRoles: ('QA_LEAD' | 'COMPLIANCE_OFFICER')[];
}
