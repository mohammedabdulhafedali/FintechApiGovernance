import { FieldDelta } from '../../domain/governance/GovernanceWorkflowTypes.js';

export class DeepDiffService {
  /**
   * Computes human-readable field differences between snapshotBefore and payload.
   */
  static calculateDiff(before: any, after: any): FieldDelta[] {
    const deltas: FieldDelta[] = [];
    if (!before && !after) return deltas;

    if (!before && after) {
      // Entirely new entity created
      for (const [key, val] of Object.entries(after)) {
        if (val !== undefined && val !== null) {
          deltas.push({
            field: key,
            labelAr: this.getFieldArabicLabel(key),
            oldValue: null,
            newValue: typeof val === 'object' ? JSON.stringify(val) : val,
            type: 'ADDED'
          });
        }
      }
      return deltas;
    }

    if (before && !after) {
      // Entity deleted
      for (const [key, val] of Object.entries(before)) {
        if (val !== undefined && val !== null) {
          deltas.push({
            field: key,
            labelAr: this.getFieldArabicLabel(key),
            oldValue: typeof val === 'object' ? JSON.stringify(val) : val,
            newValue: null,
            type: 'REMOVED'
          });
        }
      }
      return deltas;
    }

    // Compare fields
    const allKeys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));

    for (const key of allKeys) {
      // Ignore internal timestamp keys if desirable
      if (['updatedAt', 'lastModified'].includes(key)) continue;

      const oldVal = before[key];
      const newVal = after[key];

      const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? '');
      const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '');

      if (oldVal === undefined && newVal !== undefined) {
        deltas.push({
          field: key,
          labelAr: this.getFieldArabicLabel(key),
          oldValue: null,
          newValue: newVal,
          type: 'ADDED'
        });
      } else if (oldVal !== undefined && newVal === undefined) {
        deltas.push({
          field: key,
          labelAr: this.getFieldArabicLabel(key),
          oldValue: oldVal,
          newValue: null,
          type: 'REMOVED'
        });
      } else if (oldStr !== newStr) {
        deltas.push({
          field: key,
          labelAr: this.getFieldArabicLabel(key),
          oldValue: oldVal,
          newValue: newVal,
          type: 'MODIFIED'
        });
      }
    }

    return deltas;
  }

  private static getFieldArabicLabel(key: string): string {
    const dictionary: Record<string, string> = {
      nameAr: 'الاسم بالعربية',
      nameEn: 'الاسم بالإنجليزية',
      descriptionAr: 'الوصف بالعربية',
      descriptionEn: 'الوصف بالإنجليزية',
      code: 'رمز الكيان',
      path: 'مسار الـ API',
      method: 'طريقة الاستدعاء (Method)',
      version: 'رقم الإصدار',
      isFinancial: 'عملية مالية حساسة',
      requiresAuth: 'تتطلب مصادقة أمنية',
      username: 'اسم المستخدم',
      displayName: 'الاسم المعروض',
      email: 'البريد الإلكتروني',
      groupId: 'معرف المجموعة',
      groupName: 'اسم المجموعة',
      isActive: 'الحالة التشغيلية (نشط)',
      permissions: 'حزمة الصلاحيات',
      permissionOverrides: 'التجاوزات المباشرة للصلاحيات',
      assignedPermissions: 'الصلاحيات المسندة',
      color: 'اللون والسمة'
    };
    return dictionary[key] || key;
  }
}
