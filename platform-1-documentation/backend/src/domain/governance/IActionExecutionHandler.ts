/**
 * Action Execution Handler Interface adhering to SOLID Open/Closed Principle (OCP)
 * Enables any current or future system action to be executed dynamically after approvals.
 */

export interface IActionExecutionHandler {
  readonly resourceKey: string;
  readonly actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  execute(payload: any, targetResourceId?: string, snapshotBefore?: any): Promise<{ success: boolean; result?: any; error?: string }>;
}
