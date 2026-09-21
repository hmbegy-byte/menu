const MANAGED_STAFF_EMAIL_SUFFIX = "@staff.flavor-flow.invalid";

export function isManagedStaffEmail(email) {
  return (
    typeof email === "string" && email.trim().toLowerCase().endsWith(MANAGED_STAFF_EMAIL_SUFFIX)
  );
}
