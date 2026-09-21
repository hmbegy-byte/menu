const HOSTED_PLATFORM_HOSTS = new Set([
  "flavor-flow-saudi.onrender.com",
  "flavor-flow-saudi.gtsoes67955.chatgpt.site",
]);

export function isHostedPlatformHost(hostname) {
  return HOSTED_PLATFORM_HOSTS.has(
    String(hostname || "")
      .toLowerCase()
      .replace(/^www\./, ""),
  );
}

export function safeRememberedStore(value, fallback = "demo") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(normalized) ? normalized : fallback;
}
