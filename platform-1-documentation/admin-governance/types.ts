export interface ReleaseApprovalPolicy {
  minApprovers: number;
  requiredRoles: ('CHIEF_SECURITY_OFFICER' | 'API_ARCHITECT' | 'PRODUCT_OWNER')[];
  allowSelfApproval: boolean;
  requireDiffReview: boolean;
}

export interface SpecAccessRule {
  apiCode: string;
  allowedRoles: string[];
  canEditPublished: boolean;
  canDeprecate: boolean;
}

export interface DigitalSignaturePolicy {
  algorithm: 'RSA-PSS-4096' | 'ECDSA-P384';
  digestAlgorithm: 'SHA-256' | 'SHA-512';
  requireHardwareSecurityModule: boolean;
  signatureValidityDays: number;
}
