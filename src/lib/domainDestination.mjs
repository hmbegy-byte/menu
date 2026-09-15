/** Accept a single joined store only; ambiguous relations must not route customers.
 * @param {unknown} relation
 * @returns {string | null}
 */
export function domainStoreSlug(relation) {
  if (Array.isArray(relation)) {
    if (relation.length !== 1) return null;
    return domainStoreSlug(relation[0]);
  }
  if (!relation || typeof relation !== "object" || !("slug" in relation)) return null;
  const slug = relation.slug;
  return typeof slug === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(slug) ? slug : null;
}
