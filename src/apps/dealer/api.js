// Dealer API client
const API_BASE='/api/dealer';
const TOKEN_KEY='chfpl_dealer_token';
export function getDealerToken(){return localStorage.getItem(TOKEN_KEY)}
export function setDealerToken(token){localStorage.setItem(TOKEN_KEY,token)}
export function clearDealerToken(){localStorage.removeItem(TOKEN_KEY)}
function authHeaders(){const token=getDealerToken();return token?{Authorization:`Bearer ${token}`}:{}}
async function api(path,options={}){const res=await fetch(path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...authHeaders(),...(options.headers||{})}});const data=await res.json();if(!res.ok||!data.success){const e=new Error(data.error||'Request failed');e.details=data.errors;throw e}return data}
export function loginDealer({phone,password}){return api(`${API_BASE}/login`,{method:'POST',body:JSON.stringify({phone,password})}).then(d=>{setDealerToken(d.token);return d})}
export function fetchVehicleModels(){return api(`${API_BASE}/list-vehicle-models`).then(d=>d.models)}
export function fetchLoanApplications(){return api(`${API_BASE}/list-loan-applications`).then(d=>d.applications)}
export function createLoanApplication({customer,vehicleLoan,guarantors}){return api(`${API_BASE}/create-loan-application`,{method:'POST',body:JSON.stringify({customer,vehicleLoan,guarantors})})}
export function fetchDealerProfile(){return api(`${API_BASE}/profile`).then(d=>d.profile)}
export function updateDealerProfile(body){return api(`${API_BASE}/profile`,{method:'PATCH',body:JSON.stringify(body)}).then(d=>d.profile)}
export function fetchAvailableLoans(){return api('/api/workflow/available-loans').then(d=>d.loans)}
export function fetchDeliveries(){return api('/api/workflow/deliveries').then(d=>d.deliveries)}
export function lockDelivery(body){return api('/api/workflow/deliveries',{method:'POST',body:JSON.stringify(body)}).then(d=>d.delivery)}
export function createDealerSale(body){return api('/api/workflow/sales',{method:'POST',body:JSON.stringify(body)}).then(d=>d.sale)}
export function fetchDealerSales(){return api('/api/workflow/sales').then(d=>d.sales)}
