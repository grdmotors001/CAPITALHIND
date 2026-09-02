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
  '/admin/payment-vouchers': route_admin_payment_vouchers,
  '/admin/receipt-loans': route_admin_receipt_loans,
  '/admin/receipts': route_admin_receipts,
  '/admin/staff/create': route_admin_staff_create,
  '/admin/staff/delete': route_admin_staff_delete,
  '/admin/staff/list': route_admin_staff_list,
  '/admin/staff/update': route_admin_staff_update,
  '/admin/update-user': route_admin_update_user,
  '/collection/messages': route_collection_messages,
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
  '/field-executive/list-assigned': route_field_executive_list_assigned,
  '/field-executive/submit-fi': route_field_executive_submit_fi,
  '/team-leader/assign-register': route_team_leader_assign_register,
  '/team-leader/overview': route_team_leader_overview,
  '/team-leader/unassign-register': route_team_leader_unassign_register,
  '/tele-caller/dashboard': route_tele_caller_dashboard,
  '/tele-caller/log-call': route_tele_caller_log_call,
  '/users/login': route_users_login,
};

import route_admin_add_receipt from './server/api/admin/add-receipt.js';
import route_admin_assign_fe from './server/api/admin/assign-fe.js';
import route_admin_create_loan from './server/api/admin/create-loan.js';
import route_admin_create_user from './server/api/admin/create-user.js';
import route_admin_dashboard_stats from './server/api/admin/dashboard-stats.js';
import route_admin_dealers from './server/api/admin/dealers.js';
import route_admin_delete_user from './server/api/admin/delete-user.js';
import route_admin_export_cibil from './server/api/admin/export-cibil.js';
import route_admin_import_loan_cases from './server/api/admin/import-loan-cases.js';
import route_admin_list_approved_loans from './server/api/admin/list-approved-loans.js';
import route_admin_list_loan_applications from './server/api/admin/list-loan-applications.js';
import route_admin_list_users from './server/api/admin/list-users.js';
import route_admin_loan_cases from './server/api/admin/loan-cases.js';
import route_admin_login from './server/api/admin/login.js';
import route_admin_masters_create_hp from './server/api/admin/masters/create-hp.js';
import route_admin_masters_create_loan_type from './server/api/admin/masters/create-loan-type.js';
import route_admin_masters_create_oem from './server/api/admin/masters/create-oem.js';
import route_admin_masters_create_vehicle_model from './server/api/admin/masters/create-vehicle-model.js';
import route_admin_masters_delete_hp from './server/api/admin/masters/delete-hp.js';
import route_admin_masters_delete_loan_type from './server/api/admin/masters/delete-loan-type.js';
import route_admin_masters_delete_oem from './server/api/admin/masters/delete-oem.js';
import route_admin_masters_delete_vehicle_model from './server/api/admin/masters/delete-vehicle-model.js';
import route_admin_masters_list_hp from './server/api/admin/masters/list-hp.js';
import route_admin_masters_list_loan_types from './server/api/admin/masters/list-loan-types.js';
import route_admin_masters_list_oems from './server/api/admin/masters/list-oems.js';
import route_admin_masters_list_vehicle_models from './server/api/admin/masters/list-vehicle-models.js';
import route_admin_masters_update_hp from './server/api/admin/masters/update-hp.js';
import route_admin_masters_update_loan_type from './server/api/admin/masters/update-loan-type.js';
import route_admin_masters_update_oem from './server/api/admin/masters/update-oem.js';
import route_admin_masters_update_vehicle_model from './server/api/admin/masters/update-vehicle-model.js';
import route_admin_payment_vouchers from './server/api/admin/payment-vouchers.js';
import route_admin_receipt_loans from './server/api/admin/receipt-loans.js';
import route_admin_receipts from './server/api/admin/receipts.js';
import route_admin_staff_create from './server/api/admin/staff/create.js';
import route_admin_staff_delete from './server/api/admin/staff/delete.js';
import route_admin_staff_list from './server/api/admin/staff/list.js';
import route_admin_staff_update from './server/api/admin/staff/update.js';
import route_admin_update_user from './server/api/admin/update-user.js';
import route_collection_messages from './server/api/collection/messages.js';
import route_customer_google_login from './server/api/customer/google-login.js';
import route_customer_my_loans from './server/api/customer/my-loans.js';
import route_customer_request_otp from './server/api/customer/request-otp.js';
import route_customer_verify_otp from './server/api/customer/verify-otp.js';
import route_dealer_create_loan_application from './server/api/dealer/create-loan-application.js';
import route_dealer_list_loan_applications from './server/api/dealer/list-loan-applications.js';
import route_dealer_list_vehicle_models from './server/api/dealer/list-vehicle-models.js';
import route_dealer_login from './server/api/dealer/login.js';
import route_dealer_profile from './server/api/dealer/profile.js';
import route_dealer_upload_kyc_document from './server/api/dealer/upload-kyc-document.js';
import route_do_decide from './server/api/do/decide.js';
import route_do_list_pending from './server/api/do/list-pending.js';
import route_field_executive_collect_cash from './server/api/field-executive/collect-cash.js';
import route_field_executive_list_assigned from './server/api/field-executive/list-assigned.js';
import route_field_executive_submit_fi from './server/api/field-executive/submit-fi.js';
import route_team_leader_assign_register from './server/api/team-leader/assign-register.js';
import route_team_leader_overview from './server/api/team-leader/overview.js';
import route_team_leader_unassign_register from './server/api/team-leader/unassign-register.js';
import route_tele_caller_dashboard from './server/api/tele-caller/dashboard.js';
import route_tele_caller_log_call from './server/api/tele-caller/log-call.js';
import route_users_login from './server/api/users/login.js';

export default async function handler(req, res) {
  const rawPath = req.query?.path;
  const pathParts = Array.isArray(rawPath) ? rawPath : (rawPath ? [rawPath] : []);
  const routePath = '/' + pathParts.join('/');
  const route = routes[routePath];

  if (!route) {
    return res.status(404).json({ success: false, error: `API route not found: ${routePath}` });
  }

  return route(req, res);
}
