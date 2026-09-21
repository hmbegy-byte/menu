const organizationSections = new Set(["retention", "loyalty", "white-label"]);

export function requiresOrganizationAccess(section) {
  return organizationSections.has(section);
}
