// POST /api/admin/import-receipts — bulk receipt import from parsed Excel/CSV rows.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';
function clean(v){return v===undefined||v===null?'':String(v).trim()}
function num(v){const x=clean(v).replace(/[,₹]/g,'');return x===''?null:Number(x)}
function date(v){if(!v)return new Date().toISOString().slice(0,10); if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10); const s=clean(v); if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s; const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`; const d=new Date(s);return Number.isNaN(d.getTime())?new Date().toISOString().slice(0,10):d.toISOString().slice(0,10)}
export default async function handler(req,res){
 if(!methodGuard(req,res,'POST'))return; const session=requireAdminAuth(req,res);if(!session)return;
 const rows=Array.isArray(req.body?.rows)?req.body.rows:[]; if(!rows.length)return sendError(res,422,'No rows received.'); if(rows.length>1000)return sendError(res,422,'Maximum 1000 rows per import.');
 const s=getSupabase(); const results=[]; let created=0,updated=0;
 for(let i=0;i<rows.length;i++){
  const r=rows[i]||{}, row=i+2;
  try{
   const loanNo=clean(r.loan_account_no||r.loan_no||r.account_no); const amount=num(r.amount||r.receipt_amount); if(!loanNo)throw new Error('Loan Account No. is required'); if(!(amount>0))throw new Error('Amount must be greater than zero');
   const {data:loans,error:le}=await s.from('loan_applications').select('id').or(`loan_account_no.eq.${loanNo},application_no.eq.${loanNo}`).limit(1); if(le)throw le; const loan=loans?.[0]; if(!loan)throw new Error(`Loan not found: ${loanNo}`);
   const receiptNo=clean(r.receipt_no)||`RCPT-${Date.now().toString().slice(-10)}-${i+1}`;
   const payload={loan_application_id:loan.id,receipt_no:receiptNo,receipt_date:date(r.receipt_date),amount,payment_mode:(clean(r.payment_mode)||'cash').toLowerCase(),reference_no:clean(r.reference_no)||null,remarks:clean(r.remarks)||null,entered_by:session.user_id};
   const {data:existing}=await s.from('loan_receipts').select('id').eq('receipt_no',receiptNo).maybeSingle();
   if(existing){const {error}=await s.from('loan_receipts').update(payload).eq('id',existing.id);if(error)throw error;updated++;results.push({row,receipt_no:receiptNo,status:'updated'});}
   else {const {error}=await s.from('loan_receipts').insert(payload);if(error)throw error;created++;results.push({row,receipt_no:receiptNo,status:'created'});}
  }catch(e){results.push({row,receipt_no:clean(r.receipt_no),status:'error',error:e.message||'Import failed'})}
 }
 return res.status(200).json({success:true,created,updated,failed:results.filter(x=>x.status==='error').length,results});
}
