const TOKEN_KEY='chfpl_staff_token';
export function getStaffToken(){return localStorage.getItem(TOKEN_KEY);}
export function setStaffToken(token){localStorage.setItem(TOKEN_KEY,token);}
export function clearStaffToken(){localStorage.removeItem(TOKEN_KEY);}
export function loginStaff({identifier,password}){
 return fetch('/api/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})})
  .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.error||'Login failed');return d;})
  .then(d=>{setStaffToken(d.token);return d;});
}
