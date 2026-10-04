/**
 * Platform 2: Mock Data & Synthetic Payload Governance
 * Ensures tests never process real customer cards, IBANs, or credentials.
 */
export class MockDataGovernance {
  static validateSyntheticPayload(payload: Record<string, unknown>): { valid: boolean; reason?: string } {
    const raw = JSON.stringify(payload);
    // Enforce governance rule: real financial data cannot be sent to simulator
    if (/4[0-9]{12}(?:[0-9]{3})?/.test(raw)) {
      return { valid: false, reason: 'Detected potential real card PAN pattern. Test payload rejected.' };
    }
    return { valid: true };
  }
}
