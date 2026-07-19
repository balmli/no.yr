export function normalizeCapabilityValue(value: unknown): unknown | null {
    return value === undefined ? null : value;
}
