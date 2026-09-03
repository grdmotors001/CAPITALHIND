// Hobby-plan grouped Vercel Function. One function per API domain/role.
import route_create_loan_application_0 from '../lib/api/dealer/create-loan-application.js';
import route_list_loan_applications_1 from '../lib/api/dealer/list-loan-applications.js';
import route_list_vehicle_models_2 from '../lib/api/dealer/list-vehicle-models.js';
import route_login_3 from '../lib/api/dealer/login.js';
import route_profile_4 from '../lib/api/dealer/profile.js';
import route_upload_kyc_document_5 from '../lib/api/dealer/upload-kyc-document.js';

const routes = {
  '/create-loan-application': route_create_loan_application_0,
  '/list-loan-applications': route_list_loan_applications_1,
  '/list-vehicle-models': route_list_vehicle_models_2,
  '/login': route_login_3,
  '/profile': route_profile_4,
  '/upload-kyc-document': route_upload_kyc_document_5,
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
