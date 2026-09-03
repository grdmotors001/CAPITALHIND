import { apiGet, apiPost } from '../../utils/appUserAuth';

const BASE = '/api/do';

export function listPendingDecisions() {
  return apiGet(BASE, 'list-pending');
}

export function decideApplication(payload) {
  return apiPost(BASE, 'decide', payload);
}

export function listTVR() { return apiGet(BASE, 'list-tvr'); }
export function decideTVR(payload) { return apiPost(BASE, 'decide-tvr', payload); }
