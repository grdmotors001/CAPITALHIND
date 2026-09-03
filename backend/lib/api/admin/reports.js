// GET /api/admin/reports — operational/accounting report center.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

const esc = (v) => `"${String(v ?? '').replaceAll('"','""')}"`;
const dateOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

export default async function handler(req,res){
  if(!methodGuard(req,res,'GET')) return;
  const session=requireAdminAuth(req,res); if(!session)return;
  const s=getSupabase();
  try {
    const from = dateOk(req.query?.from) ? req.query.from : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
    const to = dateOk(req.query?.to) ? req.query.to : new Date().toISOString().slice(0,10);
    const report = String(req.query?.report || 'daybook');
    const vchType = String(req.query?.vchType || 'All');
    const username = String(req.query?.username || 'All');
    const ledger = String(req.query?.ledger || 'All');

    const [receiptsQ, vouchersQ, expensesQ, chargesQ, reposQ, usersQ, ledgersQ] = await Promise.all([
      s.from('loan_receipts').select('id,receipt_no,receipt_date,amount,payment_mode,remarks,entered_by,loan_applications(application_no,loan_account_no,vehicle_no,customer_profiles(full_name,phone))').gte('receipt_date',from).lte('receipt_date',to).order('receipt_date',{ascending:true}).limit(2000),
      s.from('loan_payment_vouchers').select('id,voucher_no,voucher_date,amount,voucher_type,narration,recipient_user_id,recipient_name,created_by,loan_applications(application_no,loan_account_no,vehicle_no,customer_profiles(full_name,phone))').gte('voucher_date',from).lte('voucher_date',to).order('voucher_date',{ascending:true}).limit(2000),
      s.from('loan_expenses').select('id,expense_date,amount,remarks,created_by,expense_master(expense_name),loan_applications(application_no,loan_account_no,vehicle_no,customer_profiles(full_name,phone))').gte('expense_date',from).lte('expense_date',to).order('expense_date',{ascending:true}).limit(2000),
      s.from('loan_charges').select('id,charge_date,amount,charge_name,created_by,loan_applications(application_no,loan_account_no,vehicle_no,customer_profiles(full_name,phone))').gte('charge_date',from).lte('charge_date',to).order('charge_date',{ascending:true}).limit(2000),
      s.from('vehicle_repossessions').select('id,repo_date,repo_time,vehicle_no,seized_by_fe_id,remarks,loan_applications(application_no,loan_account_no,vehicle_no,customer_profiles(full_name,phone)),dealer_master(dealer_name),battery_master(battery_name)').gte('repo_date',from).lte('repo_date',to).order('repo_date',{ascending:true}).limit(2000),
      s.from('users').select('id,full_name,role').eq('is_active',true).order('full_name',{ascending:true}),
      s.from('expense_master').select('expense_name').eq('is_active',true).order('expense_name',{ascending:true}),
    ]);
    const qs = [receiptsQ,vouchersQ,expensesQ,chargesQ,reposQ];
    const bad = qs.find(x=>x.error);
    if(bad){ console.error('[admin/reports]',bad.error); return sendError(res,500,'Could not load report data.'); }

    const users = usersQ.data || [];
    const userMap = Object.fromEntries(users.map(u=>[u.id,u]));
    let rows=[];
    const push=(r)=>{
      if(username!=='All' && r.user_id!==username) return;
      if(ledger!=='All' && r.ledger_name!==ledger) return;
      if(vchType!=='All' && r.type!==vchType) return;
      rows.push(r);
    };

    if(report==='repo'){
      for(const r of reposQ.data||[]) push({id:r.id,date:r.repo_date,voucher_no:`REPO-${String(r.id).slice(0,8)}`,type:'Repo',particulars:r.loan_applications?.customer_profiles?.full_name || '—',customer:r.loan_applications?.customer_profiles?.full_name,loan:r.loan_applications?.loan_account_no||r.loan_applications?.application_no,vehicle_no:r.vehicle_no,ledger_name:r.dealer_master?.dealer_name||'Repo',debit:0,credit:0,balance:0,user_id:r.seized_by_fe_id,username:userMap[r.seized_by_fe_id]?.full_name||'—'});
    } else {
      if(report==='daybook' || report==='collections' || report==='loan-ledger') for(const r of receiptsQ.data||[]) push({id:r.id,date:r.receipt_date,voucher_no:r.receipt_no,type:'Receipt',particulars:r.loan_applications?.customer_profiles?.full_name || 'Receipt',customer:r.loan_applications?.customer_profiles?.full_name,loan:r.loan_applications?.loan_account_no||r.loan_applications?.application_no,vehicle_no:r.loan_applications?.vehicle_no,ledger_name:'Loan Receipt',debit:0,credit:Number(r.amount||0),balance:0,user_id:r.entered_by,username:userMap[r.entered_by]?.full_name||'—'});
      if(report==='daybook') for(const r of vouchersQ.data||[]) push({id:r.id,date:r.voucher_date,voucher_no:r.voucher_no,type:'Payment',particulars:r.recipient_name||r.narration||'Payment',loan:r.loan_applications?.loan_account_no||r.loan_applications?.application_no,vehicle_no:r.loan_applications?.vehicle_no,ledger_name:r.voucher_type||'Payment Voucher',debit:Number(r.amount||0),credit:0,balance:0,user_id:r.recipient_user_id||r.created_by,username:userMap[r.recipient_user_id||r.created_by]?.full_name||r.recipient_name||'—'});
      if(report==='daybook' || report==='expenses') for(const r of expensesQ.data||[]) push({id:r.id,date:r.expense_date,voucher_no:`EXP-${String(r.id).slice(0,8)}`,type:'Expense',particulars:r.loan_applications?.customer_profiles?.full_name || r.remarks || 'Loan Expense',customer:r.loan_applications?.customer_profiles?.full_name,loan:r.loan_applications?.loan_account_no||r.loan_applications?.application_no,vehicle_no:r.loan_applications?.vehicle_no,ledger_name:r.expense_master?.expense_name||'Expense',debit:Number(r.amount||0),credit:0,balance:0,user_id:r.created_by,username:userMap[r.created_by]?.full_name||'—'});
      if(report==='daybook' || report==='expenses' || report==='loan-ledger') for(const r of chargesQ.data||[]) push({id:r.id,date:r.charge_date,voucher_no:`NOC-${String(r.id).slice(0,8)}`,type:'NOC Charge',particulars:r.loan_applications?.customer_profiles?.full_name || r.charge_name,customer:r.loan_applications?.customer_profiles?.full_name,loan:r.loan_applications?.loan_account_no||r.loan_applications?.application_no,vehicle_no:r.loan_applications?.vehicle_no,ledger_name:r.charge_name||'NOC Charges',debit:Number(r.amount||0),credit:0,balance:0,user_id:r.created_by,username:userMap[r.created_by]?.full_name||'—'});
    }

    rows.sort((a,b)=>String(a.date).localeCompare(String(b.date)) || String(a.voucher_no).localeCompare(String(b.voucher_no)));
    let balance=0; rows=rows.map(r=>({...r,balance:balance + Number(r.credit||0) - Number(r.debit||0)}));

    if(String(req.query?.download)==='csv'){
      const header=['Date','Voucher / Ref','Type','Particulars','Loan','Vehicle No','Ledger Name','Username','Debit','Credit','Balance'];
      const lines=[header.map(esc).join(',')];
      for(const r of rows) lines.push([r.date,r.voucher_no,r.type,r.particulars,r.loan,r.vehicle_no,r.ledger_name,r.username,r.debit,r.credit,r.balance].map(esc).join(','));
      res.setHeader('Content-Type','text/csv; charset=utf-8');
      res.setHeader('Content-Disposition',`attachment; filename="CHFPL_${report}_${from}_${to}.csv"`);
      return res.status(200).send('\ufeff'+lines.join('\n'));
    }
    const ledgers=[...new Set(rows.map(r=>r.ledger_name).filter(Boolean))].sort();
    return res.status(200).json({success:true,rows,users,ledgers,from,to,report});
  } catch(e){ console.error('[admin/reports] unhandled',e); return sendError(res,500,'Could not process report.'); }
}
