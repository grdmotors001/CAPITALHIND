// Hobby-plan compatibility: all API endpoints are served by this single catch-all Vercel function.
// Original handlers are kept under server/api with their URL paths preserved.

const routes = {
  '/admin/add-receipt': route_admin_add_receipt,
  '/admin/assign-fe': route_admin_assign_fe,
  '/admin/create-loan': route_admin_create_loan,
  '/admin/create-user': route_admin_create_user,
  '/admin/dashboard-stats': route_admin_dashboard_stats,
  '/admin/dealers': route_admin_dealers,
  '/admin/delete-user': route_admin_delete_user,
  '/admin/export-cibil': route_admin_export_cibil,
  '/admin/import-loan-cases': route_admin_import_loan_cases,
  '/admin/list-approved-loans': route_admin_list_approved_loans,
  '/admin/list-loan-applications': route_admin_list_loan_applications,
  '/admin/list-users': route_admin_list_users,
  '/admin/loan-cases': route_admin_loan_cases,
  '/admin/login': route_admin_login,
  '/admin/masters/create-hp': route_admin_masters_create_hp,
  '/admin/masters/create-loan-type': route_admin_masters_create_loan_type,
  '/admin/masters/create-oem': route_admin_masters_create_oem,
  '/admin/masters/create-vehicle-model': route_admin_masters_create_vehicle_model,
  '/admin/masters/delete-hp': route_admin_masters_delete_hp,
  '/admin/masters/delete-loan-type': route_admin_masters_delete_loan_type,
  '/admin/masters/delete-oem': route_admin_masters_delete_oem,
  '/admin/masters/delete-vehicle-model': route_admin_masters_delete_vehicle_model,
  '/admin/masters/list-hp': route_admin_masters_list_hp,
  '/admin/masters/list-loan-types': route_admin_masters_list_loan_types,
  '/admin/masters/list-oems': route_admin_masters_list_oems,
  '/admin/masters/list-vehicle-models': route_admin_masters_list_vehicle_models,
  '/admin/masters/update-hp': route_admin_masters_update_hp,
  '/admin/masters/update-loan-type': route_admin_masters_update_loan_type,
  '/admin/masters/update-oem': route_admin_masters_update_oem,
  '/admin/masters/update-vehicle-model': route_admin_masters_update_vehicle_model,
  '/admin/masters/batteries': route_admin_masters_batteries,
  '/admin/payment-vouchers': route_admin_payment_vouchers,
  '/admin/receipt-loans': route_admin_receipt_loans,
  '/admin/receipts': route_admin_receipts,
  '/admin/staff/create': route_admin_staff_create,
  '/admin/staff/delete': route_admin_staff_delete,
  '/admin/staff/list': route_admin_staff_list,
  '/admin/staff/update': route_admin_staff_update,
  '/admin/update-user': route_admin_update_user,
  '/collection/messages': route_collection_messages,
  '/cashier/dashboard': route_cashier_dashboard,
  '/cashier/collect': route_cashier_collect,
  '/customer/google-login': route_customer_google_login,
  '/customer/my-loans': route_customer_my_loans,
  '/customer/request-otp': route_customer_request_otp,
  '/customer/verify-otp': route_customer_verify_otp,
  '/dealer/create-loan-application': route_dealer_create_loan_application,
  '/dealer/list-loan-applications': route_dealer_list_loan_applications,
  '/dealer/list-vehicle-models': route_dealer_list_vehicle_models,
  '/dealer/login': route_dealer_login,
  '/dealer/profile': route_dealer_profile,
  '/dealer/upload-kyc-document': route_dealer_upload_kyc_document,
  '/do/decide': route_do_decide,
  '/do/list-pending': route_do_list_pending,
  '/field-executive/collect-cash': route_field_executive_collect_cash,
  '/field-executive/collection-history': route_field_executive_collection_history,
  '/field-executive/list-assigned': route_field_executive_list_assigned,
  '/field-executive/repossession': route_field_executive_repossession,
  '/field-executive/submit-fi': route_field_executive_submit_fi,
  '/team-leader/assign-register': route_team_leader_assign_register,
  '/team-leader/overview': route_team_leader_overview,
  '/team-leader/unassign-register': route_team_leader_unassign_register,
  '/tele-caller/dashboard': route_tele_caller_dashboard,
  '/tele-caller/log-call': route_tele_caller_log_call,
  '/users/login': route_users_login,
  '/users/profile': route_users_profile,
  '/staff/login': route_staff_login,
};

import route_admin_add_receipt from '../lib/api/admin/add-receipt.js';
import route_admin_assign_fe from '../lib/api/admin/assign-fe.js';
import route_admin_create_loan from '../lib/api/admin/create-loan.js';
import route_admin_create_user from '../lib/api/admin/create-user.js';
import route_admin_dashboard_stats from '../lib/api/admin/dashboard-stats.js';
import route_admin_dealers from '../lib/api/admin/dealers.js';
import route_admin_delete_user from '../lib/api/admin/delete-user.js';
import route_admin_export_cibil from '../lib/api/admin/export-cibil.js';
import route_admin_import_loan_cases from '../lib/api/admin/import-loan-cases.js';
import route_admin_list_approved_loans from '../lib/api/admin/list-approved-loans.js';
import route_admin_list_loan_applications from '../lib/api/admin/list-loan-applications.js';
import route_admin_list_users from '../lib/api/admin/list-users.js';
import route_admin_loan_cases from '../lib/api/admin/loan-cases.js';
import route_admin_login from '../lib/api/admin/login.js';
import route_admin_masters_create_hp from '../lib/api/admin/masters/create-hp.js';
import route_admin_masters_create_loan_type from '../lib/api/admin/masters/create-loan-type.js';
import route_admin_masters_create_oem from '../lib/api/admin/masters/create-oem.js';
import route_admin_masters_create_vehicle_model from '../lib/api/admin/masters/create-vehicle-model.js';
import route_admin_masters_delete_hp from '../lib/api/admin/masters/delete-hp.js';
import route_admin_masters_delete_loan_type from '../lib/api/admin/masters/delete-loan-type.js';
import route_admin_masters_delete_oem from '../lib/api/admin/masters/delete-oem.js';
import route_admin_masters_delete_vehicle_model from '../lib/api/admin/masters/delete-vehicle-model.js';
import route_admin_masters_list_hp from '../lib/api/admin/masters/list-hp.js';
import route_admin_masters_list_loan_types from '../lib/api/admin/masters/list-loan-types.js';
import route_admin_masters_list_oems from '../lib/api/admin/masters/list-oems.js';
import route_admin_masters_list_vehicle_models from '../lib/api/admin/masters/list-vehicle-models.js';
import route_admin_masters_update_hp from '../lib/api/admin/masters/update-hp.js';
import route_admin_masters_update_loan_type from '../lib/api/admin/masters/update-loan-type.js';
import route_admin_masters_update_oem from '../lib/api/admin/masters/update-oem.js';
import route_admin_masters_update_vehicle_model from '../lib/api/admin/masters/update-vehicle-model.js';
import route_admin_masters_batteries from '../lib/api/admin/masters/batteries.js';
import route_admin_payment_vouchers from '../lib/api/admin/payment-vouchers.js';
import route_admin_receipt_loans from '../lib/api/admin/receipt-loans.js';
import route_admin_receipts from '../lib/api/admin/receipts.js';
import route_admin_staff_create from '../lib/api/admin/staff/create.js';
import route_admin_staff_delete from '../lib/api/admin/staff/delete.js';
import route_admin_staff_list from '../lib/api/admin/staff/list.js';
import route_admin_staff_update from '../lib/api/admin/staff/update.js';
import route_admin_update_user from '../lib/api/admin/update-user.js';
import route_collection_messages from '../lib/api/collection/messages.js';
import route_cashier_dashboard from '../lib/api/cashier/dashboard.js';
import route_cashier_collect from '../lib/api/cashier/collect.js';
import route_customer_google_login from '../lib/api/customer/google-login.js';
import route_customer_my_loans from '../lib/api/customer/my-loans.js';
import route_customer_request_otp from '../lib/api/customer/request-otp.js';
import route_customer_verify_otp from '../lib/api/customer/verify-otp.js';
import route_dealer_create_loan_application from '../lib/api/dealer/create-loan-application.js';
import route_dealer_list_loan_applications from '../lib/api/dealer/list-loan-applications.js';
import route_dealer_list_vehicle_models from '../lib/api/dealer/list-vehicle-models.js';
import route_dealer_login from '../lib/api/dealer/login.js';
import route_dealer_profile from '../lib/api/dealer/profile.js';
import route_dealer_upload_kyc_document from '../lib/api/dealer/upload-kyc-document.js';
import route_do_decide from '../lib/api/do/decide.js';
import route_do_list_pending from '../lib/api/do/list-pending.js';
import route_field_executive_collect_cash from '../lib/api/field-executive/collect-cash.js';
import route_field_executive_collection_history from '../lib/api/field-executive/collection-history.js';
import route_field_executive_list_assigned from '../lib/api/field-executive/list-assigned.js';
import route_field_executive_repossession from '../lib/api/field-executive/repossession.js';
import route_field_executive_submit_fi from '../lib/api/field-executive/submit-fi.js';
import route_team_leader_assign_register from '../lib/api/team-leader/assign-register.js';
import route_team_leader_overview from '../lib/api/team-leader/overview.js';
import route_team_leader_unassign_register from '../lib/api/team-leader/unassign-register.js';
import route_tele_caller_dashboard from '../lib/api/tele-caller/dashboard.js';
import route_tele_caller_log_call from '../lib/api/tele-caller/log-call.js';
import route_users_login from '../lib/api/users/login.js';
import route_users_profile from '../lib/api/users/profile.js';
import route_staff_login from '../lib/api/staff/login.js';

export default async function handler(req, res) {
  const rawPath = req.query?.path;
  const pathParts = Array.isArray(rawPath) ? rawPath : (rawPath ? [rawPath] : []);
  let routePath = '/' + pathParts.join('/');

  // Support both direct catch-all requests (/api/users/profile) and Vercel
  // rewrites such as /api/users?path=profile. In the latter case req.query.path
  // contains only the suffix, so include the /api/<group> pathname as well.
  try {
    const pathname = new URL(req.url || '/', 'https://chfpl.local').pathname.replace(/\/$/, '');
    if (pathname.startsWith('/api/') && pathname !== '/api') {
      const pathnameTail = pathname.slice(4); // keep leading slash: /users[/profile]
      const rawJoined = pathParts.join('/');
      if (rawJoined && (pathnameTail === '/' + rawJoined || pathnameTail.endsWith('/' + rawJoined))) {
        routePath = pathnameTail;
      } else if (rawJoined) {
        routePath = pathnameTail + '/' + rawJoined;
      } else {
        routePath = pathnameTail;
      }
    }
  } catch {
    // Fall back to Vercel's query-derived catch-all path above.
  }

  const route = routes[routePath];

  if (!route) {
    return res.status(404).json({ success: false, error: `API route not found: ${routePath}` });
  }

  return route(req, res);
}
