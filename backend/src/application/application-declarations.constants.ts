export interface CanonicalDeclaration {
  type: string;
  label: string;
  version: string;
  required: boolean;
}

export const CANONICAL_DECLARATIONS: CanonicalDeclaration[] = [
  {
    type: 'PRIVACY_POLICY',
    label: 'Privacy Policy Agreement',
    version: 'v1.2',
    required: true,
  },
  {
    type: 'TERMS_CONDITIONS',
    label: 'Terms & Conditions of Admission',
    version: 'v2.0',
    required: true,
  },
];

export interface PersistedDeclarationItem {
  type: string;
  version: string;
  accepted: boolean;
  acceptedAt: string;
  acceptedBy?: string;
  label?: string;
  required?: boolean;
}

export interface DeclarationValidationResult {
  isValid: boolean;
  missingDeclarations: string[];
  missingLabels: string[];
  acceptedDeclarations: string[];
  items: PersistedDeclarationItem[];
}

/**
 * Normalizes versions for comparison (e.g. "1.2" and "v1.2" are equivalent)
 */
export function normalizeVersion(v?: string): string {
  if (!v) return '';
  const trimmed = v.trim().toLowerCase();
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
}

/**
 * Normalizes raw declaration input from either flat booleans, items array, or mixed DTOs.
 */
export function normalizeDeclarations(
  rawDeclaration: any,
  actorUserId?: string,
  existingItems?: PersistedDeclarationItem[]
): {
  items: PersistedDeclarationItem[];
  privacyAccepted: boolean;
  privacyVersion: string;
  termsAccepted: boolean;
  termsVersion: string;
  acceptedAt: string;
  acceptedBy?: string;
} {
  const existingMap = new Map<string, PersistedDeclarationItem>();
  if (Array.isArray(existingItems)) {
    for (const item of existingItems) {
      if (item && item.type) {
        existingMap.set(item.type, item);
      }
    }
  }

  const raw = rawDeclaration || {};
  const rawItems: any[] = Array.isArray(raw.items) ? raw.items : [];
  const rawItemsMap = new Map<string, any>();
  for (const item of rawItems) {
    if (item && item.type) {
      rawItemsMap.set(item.type, item);
    }
  }

  const now = new Date().toISOString();

  // Helper to extract boolean value for a declaration type
  const isAccepted = (type: string, fallbackKeys: string[]): boolean => {
    // 1. Direct match in rawItems
    if (rawItemsMap.has(type)) {
      const it = rawItemsMap.get(type);
      return Boolean(it.accepted);
    }
    // 2. Direct match in raw object
    if (typeof raw[type] === 'boolean') {
      return raw[type];
    }
    // 3. Fallback keys in raw object
    for (const key of fallbackKeys) {
      if (typeof raw[key] === 'boolean') {
        return raw[key];
      }
    }
    // 4. Existing items map
    if (existingMap.has(type)) {
      return Boolean(existingMap.get(type)?.accepted);
    }
    return false;
  };

  const getVersion = (type: string, defaultVer: string, fallbackKeys: string[]): string => {
    if (rawItemsMap.has(type) && rawItemsMap.get(type).version) {
      return rawItemsMap.get(type).version;
    }
    for (const key of fallbackKeys) {
      if (raw[key]) return raw[key];
    }
    if (existingMap.has(type) && existingMap.get(type)?.version) {
      return existingMap.get(type)!.version;
    }
    return defaultVer;
  };

  const privacyAccepted = isAccepted('PRIVACY_POLICY', [
    'privacyAccepted',
    'privacyPolicyAccepted',
    'privacy_policy',
  ]);
  const privacyVersion = getVersion('PRIVACY_POLICY', 'v1.2', ['privacyVersion', 'privacyPolicyVersion']);

  const termsAccepted = isAccepted('TERMS_CONDITIONS', [
    'termsAccepted',
    'terms_conditions',
    'termsAndConditionsAccepted',
  ]);
  const termsVersion = getVersion('TERMS_CONDITIONS', 'v2.0', ['termsVersion', 'termsAndConditionsVersion']);

  const normalizedItems: PersistedDeclarationItem[] = CANONICAL_DECLARATIONS.map((decl) => {
    let accepted = false;
    let version = decl.version;

    switch (decl.type) {
      case 'PRIVACY_POLICY':
        accepted = privacyAccepted;
        version = privacyVersion;
        break;
      case 'TERMS_CONDITIONS':
        accepted = termsAccepted;
        version = termsVersion;
        break;
    }

    const prev = existingMap.get(decl.type);
    const acceptedAt = accepted ? (prev?.accepted && prev.acceptedAt ? prev.acceptedAt : now) : now;
    const acceptedBy = actorUserId || prev?.acceptedBy || raw.acceptedBy;

    return {
      type: decl.type,
      label: decl.label,
      version,
      required: decl.required,
      accepted,
      acceptedAt,
      acceptedBy,
    };
  });

  return {
    items: normalizedItems,
    privacyAccepted,
    privacyVersion,
    termsAccepted,
    termsVersion,
    acceptedAt: raw.acceptedAt || now,
    acceptedBy: actorUserId || raw.acceptedBy,
  };
}

/**
 * Validates whether all canonical required declarations are accepted for this application.
 */
export function validateCanonicalDeclarations(
  formDataObj: any,
  appDeclarationAccepted?: boolean
): DeclarationValidationResult {
  const declObj = formDataObj?.declaration || {};
  const items: PersistedDeclarationItem[] = Array.isArray(declObj.items)
    ? declObj.items
    : [];

  const itemMap = new Map<string, PersistedDeclarationItem>();
  for (const it of items) {
    if (it && it.type) {
      itemMap.set(it.type, it);
    }
  }

  const missingDeclarations: string[] = [];
  const missingLabels: string[] = [];
  const acceptedDeclarations: string[] = [];

  for (const canonical of CANONICAL_DECLARATIONS) {
    let isAccepted = false;

    // Check item in items array
    if (itemMap.has(canonical.type)) {
      const it = itemMap.get(canonical.type)!;
      const verMatches =
        !canonical.version ||
        normalizeVersion(it.version) === normalizeVersion(canonical.version);
      if (it.accepted && verMatches) {
        isAccepted = true;
      }
    }

    // Fallback checks against top-level declaration object keys
    if (!isAccepted) {
      if (canonical.type === 'PRIVACY_POLICY') {
        const ver = declObj.privacyVersion || declObj.privacyPolicyVersion || 'v1.2';
        if (
          (declObj.privacyAccepted || declObj.privacyPolicyAccepted) &&
          normalizeVersion(ver) === normalizeVersion(canonical.version)
        ) {
          isAccepted = true;
        }
      } else if (canonical.type === 'TERMS_CONDITIONS') {
        const ver = declObj.termsVersion || declObj.termsAndConditionsVersion || 'v2.0';
        if (
          declObj.termsAccepted &&
          normalizeVersion(ver) === normalizeVersion(canonical.version)
        ) {
          isAccepted = true;
        }
      }
    }

    // Also support legacy single boolean if top-level flags were marked true
    if (
      !isAccepted &&
      appDeclarationAccepted &&
      canonical.required &&
      declObj.privacyAccepted &&
      declObj.termsAccepted
    ) {
      isAccepted = true;
    }

    if (isAccepted) {
      acceptedDeclarations.push(canonical.type);
    } else if (canonical.required) {
      missingDeclarations.push(canonical.type);
      missingLabels.push(`${canonical.label} (${canonical.version})`);
    }
  }

  const isValid = missingDeclarations.length === 0;

  return {
    isValid,
    missingDeclarations,
    missingLabels,
    acceptedDeclarations,
    items,
  };
}
