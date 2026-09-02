import { apiGet, apiPost } from '../../utils/appUserAuth';

const BASE = '/api/field-executive';

export function listAssignedVisits() { return apiGet(BASE, 'list-assigned'); }
export function submitFieldInvestigation(payload) { return apiPost(BASE, 'submit-fi', payload); }
export function collectCash(payload) { return apiPost(BASE, 'collect-cash', payload); }
export function getCollectionHistory() { return apiGet(BASE, 'collection-history'); }
export function getRepoOptions() { return apiGet(BASE, 'repossession'); }
export function recordRepo(payload) { return apiPost(BASE, 'repossession', payload); }
