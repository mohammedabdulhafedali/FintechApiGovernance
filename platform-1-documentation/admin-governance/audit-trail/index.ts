/**
 * Platform 1: Documentation Audit Trail
 * Logs spec lifecycle actions (draft, review, seal, publish, deprecate).
 */
export interface SpecAuditEntry {
  action: 'CREATE' | 'DIFF_RUN' | 'SEAL' | 'PUBLISH' | 'DEPRECATE';
  specId: string;
  performedBy: string;
  timestamp: string;
  signature?: string;
}
