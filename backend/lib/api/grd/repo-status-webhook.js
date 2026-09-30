import { getSupabase } from '../_lib/supabase.js';

function authorized(req){
  const expected=process.env.CHFPL_GRD_BRIDGE_SECRET || '';
  const provided=req.headers['x-grd-bridge-secret'] || '';
  return !!expected && provided===expected;
}

export default async function handler(req,res){
  if(!authorized(req)) return res.status(401).json({success:false,error:'GRD bridge authentication required'});
  if(req.method!=='POST') return res.status(405).json({success:false,error:'Method not allowed'});

  try{
    const s=getSupabase();
    const body=req.body||{};
    const list=Array.isArray(body.vehicles)
      ? body.vehicles
      : (body.vehicle && typeof body.vehicle==='object' ? [body.vehicle] : [body]);

    const results=[];
    for(const v of list){
      const ref=String(v.source_ref??v.id??v.repo_id??'').trim();
      const status=String(v.resale_status??v.status??'').trim().toUpperCase().replace(/[\\s-]+/g,'_');
      if(!ref || !status){
        results.push({ok:false,source_ref:ref,error:'source_ref and resale_status are required.'});
        continue;
      }

      const allowed=['SEIZED','AVAILABLE_FOR_SALE','SOLD'];
      if(!allowed.includes(status)){
        results.push({ok:false,source_ref:ref,error:'Invalid resale status.'});
        continue;
      }

      const patch={resale_status:status};
      if(status==='SOLD'){
        // Sale details from GRD: customer, date, amount, new loan, balance, ledger no (only when loan) and DO no.
        const n=x=>{const v=Number(x);return Number.isFinite(v)?v:0};
        const sale=(v.sale&&typeof v.sale==='object')?v.sale:v;
        const loan=n(sale.loan_amount);
        const customer=String(sale.customer_name||'').trim();
        if(!customer){
          results.push({ok:false,source_ref:ref,error:'customer_name is required for a sale.'});
          continue;
        }
        patch.sold_customer_name=customer;
        patch.sold_date=String(sale.sale_date||'').slice(0,10)||new Date().toISOString().slice(0,10);
        patch.sold_amount=n(sale.sale_amount);
        patch.sold_loan_amount=loan;
        patch.sold_balance_amount=sale.balance_amount!==undefined&&sale.balance_amount!==''?n(sale.balance_amount):Math.max(0,n(sale.sale_amount)-loan);
        patch.sold_ledger_no=loan>0?(String(sale.ledger_no||'').trim()||null):null;
        patch.sold_do_no=String(sale.do_number||sale.do_no||'').trim()||null;
      }

      const {data,error}=await s.from('vehicle_repossessions')
        .update(patch)
        .eq('id',ref)
        .select('id,resale_status')
        .maybeSingle();

      if(error || !data){
        results.push({ok:false,source_ref:ref,error:error?.message||'Repo record not found.'});
      }else{
        results.push({ok:true,source_ref:ref,resale_status:data.resale_status});
      }
    }

    const failed=results.filter(x=>!x.ok).length;
    return res.status(failed===results.length&&failed>0?400:200).json({success:failed===0,results});
  }catch(e){
    console.error('[grd/repo-status-webhook]',e);
    return res.status(500).json({success:false,error:e.message||'Could not update Repo status.'});
  }
}
