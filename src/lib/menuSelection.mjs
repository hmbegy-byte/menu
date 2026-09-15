export function menuSelectionMode(item) {
  return Array.isArray(item?.groups) && item.groups.length > 0 ? "customize" : "add";
}
