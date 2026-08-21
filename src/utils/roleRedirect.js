// Central mapping: role (from users table / auth response) -> landing route
// Update ROLE_KEYS to match actual `role` column values in your `users` table.

export const ROLE_KEYS = {
  FIELD_EXECUTIVE: 'field_executive',
  TELE_CALLER: 'tele_caller',
  DEALER: 'dealer',
  CUSTOMER: 'customer',
  ADMIN: 'admin',
};

export const ROLE_ROUTES = {
  [ROLE_KEYS.FIELD_EXECUTIVE]: '/app/field-executive',
  [ROLE_KEYS.TELE_CALLER]: '/app/tele-caller',
  [ROLE_KEYS.DEALER]: '/app/dealer',
  [ROLE_KEYS.CUSTOMER]: '/app/customer-payment',
  [ROLE_KEYS.ADMIN]: '/app/admin',
};

// Called right after successful login. `role` comes from the auth/login API response.
export function getRedirectPathForRole(role) {
  return ROLE_ROUTES[role] || '/login';
}
