# Admin / Staff JSX Integration

The React project now includes the PHP `admin/manage-staff.php` functionality as a React JSX module.

## Included

- `/app/admin` — Admin dashboard
- `/app/admin/staff` — Manage Staff
- Add `staff` or `admin` accounts
- Password hashing through the existing PHP backend
- Edit mobile/email used by OTP/Google login
- Remove accounts, with protection against deleting the currently logged-in admin
- Admin/staff password login from the React login screen
- Existing MySQL `admin_users` table is reused; no second staff database is created

## PHP files to copy to the existing PHP project

Copy these two files into your existing `admin/` directory:

- `php-admin-integration/admin/react-login.php`
- `php-admin-integration/admin/staff-api.php`

They use the existing `admin/auth.php` and `api/db.php`, so the existing MySQL configuration remains the source of truth.

## Database

If your database already has the `contact_mobile` and `email` columns on `admin_users` (schema-v14), no database change is needed.

If not, run the SQL in:

`php-admin-integration/api/schema-react-admin.sql`

## Deployment

The React application and PHP admin API need to be reachable from the same domain/path so the browser can call:

- `/admin/react-login.php`
- `/admin/staff-api.php`
- `/admin/logout.php`

If the React app is hosted on a different domain, the PHP endpoints need CORS configuration and cookie/session settings adjusted for that deployment.
