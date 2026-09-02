import { apiGet, apiPost } from '../../utils/appUserAuth';

const BASE = '/api/do';

export function listPendingDecisions() {
  return apiGet(BASE, 'list-pending');
}

export function decideApplication(payload) {
  return apiPost(BASE, 'decide', payload);
}
