import { UastDocument, IUastNode, VersionDiffItem, VersionDiffReport } from './types';

export interface IVersionDiffEngine {
  compare(baseDoc: UastDocument, targetDoc: UastDocument): VersionDiffReport;
  computeNextVersion(currentVersion: string, bump: 'MAJOR' | 'MINOR' | 'PATCH'): string;
}

export class AstSemanticDiffEngine implements IVersionDiffEngine {
  public compare(baseDoc: UastDocument, targetDoc: UastDocument): VersionDiffReport {
    const diffs: VersionDiffItem[] = [];

    // Flatten both trees into path maps: Map<path, IUastNode>
    const baseMap = this.flattenTreeToPathMap(baseDoc.requestTree);
    const targetMap = this.flattenTreeToPathMap(targetDoc.requestTree);

    // 1. Check for Deleted fields (existed in base, missing in target)
    for (const [path, baseNode] of baseMap.entries()) {
      if (!targetMap.has(path)) {
        diffs.push({
          nodeId: baseNode.nodeId,
          path,
          changeType: 'DELETED',
          isBreaking: true, // Deleting any existing field is breaking in banking APIs
          oldValue: `${baseNode.semantics.name} (${baseNode.semantics.dataType})`,
          description: `تم حذف الحقل '${baseNode.semantics.name}' من مواصفة الطلب`
        });
      }
    }

    // 2. Check for Added fields (missing in base, exists in target)
    for (const [path, targetNode] of targetMap.entries()) {
      if (!baseMap.has(path)) {
        const isRequired = !!targetNode.constraints.required;
        diffs.push({
          nodeId: targetNode.nodeId,
          path,
          changeType: 'ADDED',
          isBreaking: isRequired, // Adding a REQUIRED field breaks existing consumers
          newValue: `${targetNode.semantics.name} (${targetNode.semantics.dataType}) [${isRequired ? 'إجباري' : 'اختياري'}]`,
          description: isRequired 
            ? `إضافة حقل إجباري جديد '${targetNode.semantics.name}' (تغيير كاسر للتوافق)`
            : `إضافة حقل اختياري جديد '${targetNode.semantics.name}'`
        });
      }
    }

    // 3. Check for Modified fields (present in both)
    for (const [path, baseNode] of baseMap.entries()) {
      const targetNode = targetMap.get(path);
      if (targetNode) {
        // A. Type change (Breaking)
        if (baseNode.semantics.dataType !== targetNode.semantics.dataType) {
          diffs.push({
            nodeId: targetNode.nodeId,
            path,
            changeType: 'MODIFIED',
            isBreaking: true,
            oldValue: baseNode.semantics.dataType,
            newValue: targetNode.semantics.dataType,
            description: `تغيير نوع بيانات الحقل من ${baseNode.semantics.dataType} إلى ${targetNode.semantics.dataType}`
          });
        }

        // B. Constraint change: Optional -> Required (Breaking)
        if (!baseNode.constraints.required && targetNode.constraints.required) {
          diffs.push({
            nodeId: targetNode.nodeId,
            path,
            changeType: 'MODIFIED',
            isBreaking: true,
            oldValue: 'اختياري (Optional)',
            newValue: 'إجباري (Required)',
            description: `تشديد قيد الحقل وتحويله من اختياري إلى إجباري`
          });
        }

        // C. Description / Semantic change (Patch)
        if (baseNode.semantics.description !== targetNode.semantics.description) {
          diffs.push({
            nodeId: targetNode.nodeId,
            path,
            changeType: 'MODIFIED',
            isBreaking: false,
            oldValue: baseNode.semantics.description,
            newValue: targetNode.semantics.description,
            description: `تحديث الوصف التوثيقي للحقل`
          });
        }
      }
    }

    // Determine overall severity and recommended bump
    const hasBreakingChanges = diffs.some(d => d.isBreaking);
    const hasAdditions = diffs.some(d => d.changeType === 'ADDED' || d.changeType === 'DELETED');
    
    let recommendedBump: 'MAJOR' | 'MINOR' | 'PATCH' = 'PATCH';
    if (hasBreakingChanges) {
      recommendedBump = 'MAJOR';
    } else if (hasAdditions) {
      recommendedBump = 'MINOR';
    }

    let summary = '';
    if (hasBreakingChanges) {
      const breakingCount = diffs.filter(d => d.isBreaking).length;
      summary = `تم اكتشاف ${breakingCount} تغيير كاسر للتوافق (Breaking Changes). يلزم ترقية الإصدار الرئيسي (Major).`;
    } else if (hasAdditions) {
      summary = `تغييرات متوافقة رجعياً (Non-Breaking Additions). يوصى بترقية الإصدار الفرعي (Minor).`;
    } else if (diffs.length > 0) {
      summary = `تعديلات طفيفة على الشروح والتوثيق. يوصى بترقية إصدار الصيانة (Patch).`;
    } else {
      summary = `لا توجد فروقات بين الإصدارين، الشجرتان متطابقتان تماماً.`;
    }

    return {
      baseVersion: baseDoc.semver,
      targetVersion: targetDoc.semver,
      diffs,
      hasBreakingChanges,
      recommendedBump,
      summary
    };
  }

  public computeNextVersion(currentVersion: string, bump: 'MAJOR' | 'MINOR' | 'PATCH'): string {
    const cleanVer = currentVersion.replace(/^v/i, '');
    const parts = cleanVer.split('.').map(p => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);

    let [major, minor, patch] = parts;
    if (bump === 'MAJOR') {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (bump === 'MINOR') {
      minor += 1;
      patch = 0;
    } else {
      patch += 1;
    }
    return `${major}.${minor}.${patch}`;
  }

  private flattenTreeToPathMap(node: IUastNode): Map<string, IUastNode> {
    const map = new Map<string, IUastNode>();

    const traverse = (n: IUastNode) => {
      if (n.structure.path && n.structure.path !== '$') {
        map.set(n.structure.path, n);
      }
      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return map;
  }
}

export const astDiffEngine = new AstSemanticDiffEngine();
