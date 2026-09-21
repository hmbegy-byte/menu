const PREFIX = "ffl1";

export function encodeLoyaltyQr(customerId, token) {
  if (!customerId || !token) return "";
  return `${PREFIX}:${customerId}:${token}`;
}

export function parseLoyaltyQr(value) {
  if (typeof value !== "string") return null;
  const compact = value.trim().match(/^ffl1:([0-9a-f-]{36}):([0-9a-f]{32})$/i);
  if (compact) return { customerId: compact[1], token: compact[2] };

  try {
    const legacy = JSON.parse(value);
    if (
      legacy &&
      typeof legacy === "object" &&
      typeof legacy.a === "string" &&
      typeof legacy.t === "string"
    ) {
      return { customerId: legacy.a, token: legacy.t };
    }
  } catch {
    // Not a legacy JSON loyalty code.
  }
  return null;
}
