export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: string;
  timestamp: string;
  ip?: string;
}
