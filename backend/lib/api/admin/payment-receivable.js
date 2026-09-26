// GET /api/admin/payment-receivable — EMI receivables and overdue position.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req,res){
  if(!methodGuard(req,res,'GET')) return;
  const session=requireAdminAuth(req,res); if(!session)return;
  try{
    const s=getSupabase();
    const today=new Date().toISOString().slice(0,10);
    const [{data:rows,error:loanErr},{data:receipts,error:receiptErr}]=await Promise.all([
      s.from('loan_applications').select('id,application_no,loan_account_no,application_status,loan_amount_requested,first_emi_date,emi_amount,customer_profiles(full_name,phone),dealer_master(dealer_name,dealer_code)').not('loan_account_no','is',null).order('created_at',{ascending:false}).limit(1000),
      s.from('loan_receipts').select('loan_application_id,amount,receipt_date').limit(10000),
    ]);
    if(loanErr) throw loanErr;
    if(receiptErr) throw receiptErr;
    const loanIds=(rows||[]).map(r=>r.id);
    const {data:schedule,error:scheduleErr}=loanIds.length ? await s.from('emi_schedule').select('loan_application_id,emi_no,due_date,emi_amount,paid_amount,status').in('loan_application_id',loanIds).order('due_date',{ascending:true}) : {data:[],error:null};
    if(scheduleErr) throw scheduleErr;
    const receiptMap={};
    for(const r of receipts||[]) receiptMap[r.loan_application_id]=(receiptMap[r.loan_application_id]||0)+Number(r.amount||0);
    const scheduleMap={};
    for(const e of schedule||[]){
      const k=e.loan_application_id; (scheduleMap[k] ||= []).push(e);
    }
    const loans=(rows||[]).map(r=>{
      const em= scheduleMap[r.id] || [];
      const outstanding=em.reduce((n,e)=>n+Math.max(0,Number(e.emi_amount||0)-Number(e.paid_amount||0)),0);
      const overdue=em.filter(e=>String(e.due_date)<today).reduce((n,e)=>n+Math.max(0,Number(e.emi_amount||0)-Number(e.paid_amount||0)),0);
      const dueToday=em.filter(e=>String(e.due_date)===today).reduce((n,e)=>n+Math.max(0,Number(e.emi_amount||0)-Number(e.paid_amount||0)),0);
      const next=em.find(e=>Math.max(0,Number(e.emi_amount||0)-Number(e.paid_amount||0)>0 && String(e.due_date)>=today);
      return {id:r.id,application_no:r.application_no,loan_account_no:r.loan_account_no,application_status:r.application_status,loan_amount_requested:r.loan_amount_requested,customer_name:r.customer_profiles?.full_name||'—',customer_phone:r.customer_profiles?.phone||'—',dealer_name:r.dealer_master?.dealer_name||'—',dealer_code:r.dealer_master?.dealer_code||'',total_received:receiptMap[r.id]||0,outstanding:Number(outstanding.toFixed(2)),overdue:Number(overdue.toFixed(2)),due_today:Number(dueToday.toFixed(2)),next_due_date:next?.due_date||null,next_due_amount:next?Math.max(0,Number(next.emi_amount||0)-Number(next.paid_amount||0)):0,emi_count:em.length});
    }).filter(r=>r.outstanding>0);
    const totals=loans.reduce((a,r)=>({outstanding:a.outstanding+r.outstanding,overdue:a.overdue+r.overdue,due_today:a.due_today+r.due_today,received:a.received+r.total_received}),{outstanding:0,overdue:0,due_today:0,received:0});
    return res.status(200).json({success:true,today,loans,totals:{outstanding:Number(totals.outstanding.toFixed(2)),overdue:Number(totals.overdue.toFixed(2)),due_today:Number(totals.due_today.toFixed(2)),received:Number(totals.received.toFixed(2))}});
  }catch(e){console.error('[admin/payment-receivable]',e);return sendError(res,500,'Could not load payment receivable.');}
}
