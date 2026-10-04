/**
 * Platform 1: Specification Access Control
 * Enforces permissions on catalog modifications and diff inspections.
 */
export class SpecAccessControl {
  static canModifySpec(userRole: string, isPublished: boolean): boolean {
    if (isPublished) return false; // Sealed specs cannot be mutated directly
    return ['API_ADMIN', 'CHIEF_ARCHITECT'].includes(userRole);
  }
}
