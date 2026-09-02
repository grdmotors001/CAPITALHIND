// Hobby-plan grouped Vercel Function. One function per API domain/role.
import route_add_receipt_0 from '../lib/api/admin/add-receipt.js';
import route_assign_fe_1 from '../lib/api/admin/assign-fe.js';
import route_create_loan_2 from '../lib/api/admin/create-loan.js';
import route_create_user_3 from '../lib/api/admin/create-user.js';
import route_dashboard_stats_4 from '../lib/api/admin/dashboard-stats.js';
import route_dealers_5 from '../lib/api/admin/dealers.js';
import route_delete_user_6 from '../lib/api/admin/delete-user.js';
import route_export_cibil_7 from '../lib/api/admin/export-cibil.js';
import route_import_loan_cases_8 from '../lib/api/admin/import-loan-cases.js';
import route_list_approved_loans_9 from '../lib/api/admin/list-approved-loans.js';
import route_list_loan_applications_10 from '../lib/api/admin/list-loan-applications.js';
import route_list_users_11 from '../lib/api/admin/list-users.js';
import route_loan_cases_12 from '../lib/api/admin/loan-cases.js';
import route_login_13 from '../lib/api/admin/login.js';
import route_masters_create_hp_14 from '../lib/api/admin/masters/create-hp.js';
import route_masters_create_loan_type_15 from '../lib/api/admin/masters/create-loan-type.js';
import route_masters_create_oem_16 from '../lib/api/admin/masters/create-oem.js';
import route_masters_create_vehicle_model_17 from '../lib/api/admin/masters/create-vehicle-model.js';
import route_masters_delete_hp_18 from '../lib/api/admin/masters/delete-hp.js';
import route_masters_delete_loan_type_19 from '../lib/api/admin/masters/delete-loan-type.js';
import route_masters_delete_oem_20 from '../lib/api/admin/masters/delete-oem.js';
import route_masters_delete_vehicle_model_21 from '../lib/api/admin/masters/delete-vehicle-model.js';
import route_masters_list_hp_22 from '../lib/api/admin/masters/list-hp.js';
import route_masters_list_loan_types_23 from '../lib/api/admin/masters/list-loan-types.js';
import route_masters_list_oems_24 from '../lib/api/admin/masters/list-oems.js';
import route_masters_list_vehicle_models_25 from '../lib/api/admin/masters/list-vehicle-models.js';
import route_masters_update_hp_26 from '../lib/api/admin/masters/update-hp.js';
import route_masters_update_loan_type_27 from '../lib/api/admin/masters/update-loan-type.js';
import route_masters_update_oem_28 from '../lib/api/admin/masters/update-oem.js';
import route_masters_update_vehicle_model_29 from '../lib/api/admin/masters/update-vehicle-model.js';
import route_payment_vouchers_30 from '../lib/api/admin/payment-vouchers.js';
import route_receipt_loans_31 from '../lib/api/admin/receipt-loans.js';
import route_receipts_32 from '../lib/api/admin/receipts.js';
import route_staff_create_33 from '../lib/api/admin/staff/create.js';
import route_staff_delete_34 from '../lib/api/admin/staff/delete.js';
import route_staff_list_35 from '../lib/api/admin/staff/list.js';
import route_staff_update_36 from '../lib/api/admin/staff/update.js';
import route_update_user_37 from '../lib/api/admin/update-user.js';

const routes = {
  '/add-receipt': route_add_receipt_0,
  '/assign-fe': route_assign_fe_1,
  '/create-loan': route_create_loan_2,
  '/create-user': route_create_user_3,
  '/dashboard-stats': route_dashboard_stats_4,
  '/dealers': route_dealers_5,
  '/delete-user': route_delete_user_6,
  '/export-cibil': route_export_cibil_7,
  '/import-loan-cases': route_import_loan_cases_8,
  '/list-approved-loans': route_list_approved_loans_9,
  '/list-loan-applications': route_list_loan_applications_10,
  '/list-users': route_list_users_11,
  '/loan-cases': route_loan_cases_12,
  '/login': route_login_13,
  '/masters/create-hp': route_masters_create_hp_14,
  '/masters/create-loan-type': route_masters_create_loan_type_15,
  '/masters/create-oem': route_masters_create_oem_16,
  '/masters/create-vehicle-model': route_masters_create_vehicle_model_17,
  '/masters/delete-hp': route_masters_delete_hp_18,
  '/masters/delete-loan-type': route_masters_delete_loan_type_19,
  '/masters/delete-oem': route_masters_delete_oem_20,
  '/masters/delete-vehicle-model': route_masters_delete_vehicle_model_21,
  '/masters/list-hp': route_masters_list_hp_22,
  '/masters/list-loan-types': route_masters_list_loan_types_23,
  '/masters/list-oems': route_masters_list_oems_24,
  '/masters/list-vehicle-models': route_masters_list_vehicle_models_25,
  '/masters/update-hp': route_masters_update_hp_26,
  '/masters/update-loan-type': route_masters_update_loan_type_27,
  '/masters/update-oem': route_masters_update_oem_28,
  '/masters/update-vehicle-model': route_masters_update_vehicle_model_29,
  '/payment-vouchers': route_payment_vouchers_30,
  '/receipt-loans': route_receipt_loans_31,
  '/receipts': route_receipts_32,
  '/staff/create': route_staff_create_33,
  '/staff/delete': route_staff_delete_34,
  '/staff/list': route_staff_list_35,
  '/staff/update': route_staff_update_36,
  '/update-user': route_update_user_37,
};

export default async function handler(req, res) {
  const rawPath = req.query?.path;
  const routePath = '/' + (Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '').replace(/^\/+|\/+$/g, ''));
  const route = routes[routePath];

  if (!route) {
    return res.status(404).json({ success: false, error: `API route not found: ${routePath}` });
  }

  return route(req, res);
}
