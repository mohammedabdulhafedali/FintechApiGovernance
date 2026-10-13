import { IActionExecutionHandler } from '../../domain/governance/IActionExecutionHandler.js';

/**
 * Action Registry conforming to SOLID Open/Closed Principle (OCP)
 * Handlers are registered once at composition root, allowing infinite future extension.
 */
export class ActionRegistry {
  private readonly handlers: Map<string, IActionExecutionHandler> = new Map();

  register(handler: IActionExecutionHandler): void {
    const key = `${handler.resourceKey}:${handler.actionType}`;
    this.handlers.set(key, handler);
  }

  getHandler(resourceKey: string, actionType: string): IActionExecutionHandler | undefined {
    return this.handlers.get(`${resourceKey}:${actionType}`);
  }

  async execute(resourceKey: string, actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'CUSTOM', payload: any, targetResourceId?: string, snapshotBefore?: any) {
    const handler = this.getHandler(resourceKey, actionType);
    if (!handler) {
      console.warn(`[ActionRegistry] No registered handler for ${resourceKey}:${actionType}. Staged state accepted.`);
      return { success: true };
    }
    return await handler.execute(payload, targetResourceId, snapshotBefore);
  }
}
