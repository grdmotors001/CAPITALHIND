// POST /api/admin/import-loan-cases
// Bulk import legacy/existing loan cases from an Excel/CSV sheet that has
// already been parsed by the browser. Creates/updates customer profiles,
// loan applications and up to two guarantors per row.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

const CASE_STATUSES = new Set(['active','suit_filed','vehicle_seized','closed','written_off']);
const APP_STATUSES = new Set(['submitted','fi_pending','fi_done','approved','rejected','sanctioned','disbursed']);

function clean(v) { return v === undefined || v === null ? '' : String(v).trim(); }
function nullable(v) { const x = clean(v); return x || null; }
function num(v) { const x = clean(v).replace(/[,₹]/g,''); return x === '' ? null : Number(x); }
function date(v) {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0,10);
  const s = clean(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
}
function iso(v) { const d = date(v); return d ? new Date(`${d}T00:00:00.000Z`).toISOString() : null; }

export default async function handler(req,res){
  if(!methodGuard(req,res,'POST')) return;
  const session=requireAdminAuth(req,res); if(!session)return;
  const rows=Array.isArray(req.body?.rows)?req.body.rows:[];
  if(!rows.length)return sendError(res,422,'No rows received.');
  if(rows.length>500)return sendError(res,422,'Maximum 500 rows per import.');

  const s=getSupabase(); const results=[]; let created=0,updated=0;
  try {
    for(let i=0;i<rows.length;i++){
      const r=rows[i]||{}; const rowNo=i+2;
      try {
        const loanNo=clean(r.loan_account_no);
        const customerName=clean(r.customer_name);
        const phone=clean(r.customer_phone);
        if(!loanNo) throw new Error('Loan Account No. is required');
        if(!customerName) throw new Error('Customer Name is required');
        if(!phone) throw new Error('Customer Mobile is required');

        let customerId=null;
        const {data:existingCustomers,error:ce}=await s.from('customer_profiles').select('id').eq('phone',phone).limit(1);
        if(ce) throw ce;
        customerId=existingCustomers?.[0]?.id||null;
        const customerPayload={
          full_name:customerName, phone,
          email:nullable(r.customer_email), dob:date(r.customer_dob), gender:nullable(r.customer_gender),
          address:nullable(r.customer_address), city:nullable(r.customer_city), state:nullable(r.customer_state),
          pincode:nullable(r.customer_pincode), pan:nullable(r.customer_pan), ownership_status:nullable(r.customer_ownership_status),
          landmark:nullable(r.customer_landmark), electricity_ca_no:nullable(r.customer_electricity_ca_no),
          aadhaar_masked:nullable(r.customer_aadhaar_masked), occupation:nullable(r.customer_occupation),
          monthly_income:num(r.customer_monthly_income)
        };
        if(customerId){
          const {error}=await s.from('customer_profiles').update(customerPayload).eq('id',customerId); if(error)throw error;
        } else {
          const {data,error}=await s.from('customer_profiles').insert(customerPayload).select('id').single();
          if(error)throw error; customerId=data.id;
        }

        let dealerId=null;
        const dealerCode=clean(r.dealer_code), dealerName=clean(r.dealer_name);
        if(dealerCode||dealerName){
          let q=s.from('dealer_master').select('id').limit(1);
          if(dealerCode) q=q.eq('dealer_code',dealerCode); else q=q.ilike('dealer_name',dealerName);
          const {data,error}=await q; if(error)throw error; dealerId=data?.[0]?.id||null;
          if(!dealerId) throw new Error(`Dealer not found: ${dealerCode||dealerName}`);
        }

        let vehicleModelId=null;
        const modelId=num(r.vehicle_model_id);
        if(modelId!==null) vehicleModelId=modelId;
        else if(clean(r.vehicle_model_name)){
          const {data,error}=await s.from('vehicle_model_master').select('id').ilike('model_name',clean(r.vehicle_model_name)).limit(1);
          if(error)throw error; vehicleModelId=data?.[0]?.id||null;
          if(!vehicleModelId) throw new Error(`Vehicle model not found: ${clean(r.vehicle_model_name)}`);
        }

        const appStatus=clean(r.application_status).toLowerCase()||'sanctioned';
        if(!APP_STATUSES.has(appStatus)) throw new Error(`Invalid Application Status: ${appStatus}`);
        const caseStatus=clean(r.case_status).toLowerCase()||'active';
        if(!CASE_STATUSES.has(caseStatus)) throw new Error(`Invalid Case Status: ${caseStatus}`);
        const approvedAt=iso(r.approved_at);
        const approvalValidUntil=date(r.approval_valid_until);
        const disbDate=date(r.disbursement_date);
        const cibil=num(r.cibil_score);
        const ledger=clean(r.ledger_no)||clean(r.physical_register_serial_no);

        // Legacy Excel imports often contain only the FI Executive name.
        // Resolve an exact, unique active Field Executive to assigned_fe_id so
        // existing/disbursed loans remain collectible by that FE.
        let assignedFeId = null;
        const fiExecutiveName = clean(r.fi_executive_name);
        if (fiExecutiveName) {
          const { data: feMatches, error: feLookupErr } = await s
            .from('users')
            .select('id')
            .eq('role', 'field_executive')
            .eq('is_active', true)
            .ilike('full_name', fiExecutiveName);
          if (feLookupErr) throw feLookupErr;
          if ((feMatches || []).length === 1) assignedFeId = feMatches[0].id;
        }

        const payload={
          application_no:clean(r.application_no)||`IMP-${Date.now()}-${i+1}`,
          loan_account_no:loanNo, application_status:appStatus, customer_id:customerId,
          dealer_id:dealerId, vehicle_model_id:vehicleModelId,
          vehicle_price:num(r.vehicle_price), down_payment:num(r.down_payment),
          loan_amount_requested:num(r.loan_amount_requested), tenure_months:num(r.tenure_months),
          physical_register_serial_no:nullable(ledger)?.toUpperCase()||null,
          cibil_score:cibil, cibil_checked_at:iso(r.cibil_checked_at), approved_at:approvedAt,
          approval_valid_until:approvalValidUntil, vehicle_no:nullable(r.vehicle_no)?.toUpperCase()||null,
          hypothecation:nullable(r.hypothecation), do_no:nullable(r.do_no)||loanNo, case_received_date:date(r.case_received_date),
          fi_send_date:date(r.fi_send_date), fi_received_date:date(r.fi_received_date), fi_status:nullable(r.fi_status),
          fi_executive_name:nullable(r.fi_executive_name), sanction_date:date(r.sanction_date), approved_by:nullable(r.approved_by),
          file_received_date:date(r.file_received_date), file_check_date:date(r.file_check_date), interest_rate:num(r.interest_rate),
          interest_amount:num(r.interest_amount), principal_amount:num(r.principal_amount)||num(r.loan_amount_requested),
          emi_no:num(r.emi_no)||num(r.tenure_months), emi_amount:num(r.emi_amount), vehicle_registration_date:date(r.vehicle_registration_date),
          chassis_no:nullable(r.chassis_no)?.toUpperCase()||null, ledger_no:nullable(ledger)?.toUpperCase()||null,
          file_no:nullable(r.file_no), file_record_no:nullable(r.file_record_no), cheques_qty:Math.max(0,Number(num(r.cheques_qty)||0)),
          case_status:caseStatus, disbursement_date:disbDate, disbursed_amount:num(r.disbursed_amount),
          receipt_entry_manual:true
        };
        if (assignedFeId) {
          payload.assigned_fe_id = assignedFeId;
          payload.assigned_at = new Date().toISOString();
        }
        if(appStatus==='disbursed' && !payload.disbursement_date) payload.disbursement_date=new Date().toISOString().slice(0,10);
        if(caseStatus==='vehicle_seized') payload.vehicle_seized_at=iso(r.vehicle_seized_at)||new Date().toISOString();
        else if(r.vehicle_seized_at) payload.vehicle_seized_at=iso(r.vehicle_seized_at);
        if(r.suit_filed_at) payload.suit_filed_at=iso(r.suit_filed_at);

        const {data:existingLoan,error:le}=await s.from('loan_applications').select('id').eq('loan_account_no',loanNo).limit(1);
        if(le)throw le;
        let loanId, action;
        if(existingLoan?.[0]){
          loanId=existingLoan[0].id;
          const {error}=await s.from('loan_applications').update(payload).eq('id',loanId); if(error)throw error;
          action='updated'; updated++;
        } else {
          const {data,error}=await s.from('loan_applications').insert(payload).select('id').single(); if(error)throw error;
          loanId=data.id; action='created'; created++;
        }

        // Optional co-borrower: one record per loan. Replace it when supplied.
        const cbName=clean(r.co_borrower_name);
        if(cbName){
          const coBorrower={loan_application_id:loanId,full_name:cbName,relation_with_customer:nullable(r.co_borrower_relation),phone:nullable(r.co_borrower_phone),email:nullable(r.co_borrower_email),dob:date(r.co_borrower_dob),gender:nullable(r.co_borrower_gender),address:nullable(r.co_borrower_address),city:nullable(r.co_borrower_city),state:nullable(r.co_borrower_state),pincode:nullable(r.co_borrower_pincode),pan:nullable(r.co_borrower_pan),aadhaar_masked:nullable(r.co_borrower_aadhaar_masked),occupation:nullable(r.co_borrower_occupation),monthly_income:num(r.co_borrower_monthly_income),ownership_status:nullable(r.co_borrower_ownership_status),landmark:nullable(r.co_borrower_landmark),electricity_ca_no:nullable(r.co_borrower_electricity_ca_no)};
          await s.from('co_borrower_details').delete().eq('loan_application_id',loanId);
          const {error}=await s.from('co_borrower_details').insert(coBorrower); if(error)throw error;
        }

        // Replace imported guarantors only when at least one guarantor value is supplied.
        const guarantors=[1,2].map(n=>({full_name:clean(r[`guarantor_${n}_name`]),relation_with_customer:nullable(r[`guarantor_${n}_relation`]),phone:nullable(r[`guarantor_${n}_phone`]),address:nullable(r[`guarantor_${n}_address`]),pan:nullable(r[`guarantor_${n}_pan`]),aadhaar_masked:nullable(r[`guarantor_${n}_aadhaar_masked`]),ownership_status:nullable(r[`guarantor_${n}_ownership_status`]),landmark:nullable(r[`guarantor_${n}_landmark`]),electricity_ca_no:nullable(r[`guarantor_${n}_electricity_ca_no`])})).filter(g=>g.full_name||g.phone);
        if(guarantors.length){
          await s.from('guarantor_details').delete().eq('loan_application_id',loanId);
          const {error}=await s.from('guarantor_details').insert(guarantors.map(g=>({...g,loan_application_id:loanId}))); if(error)throw error;
        }
        await s.from('application_status_history').insert({loan_application_id:loanId,from_status:null,to_status:appStatus,changed_by:session.user_id,changed_by_type:'admin',remarks:`Loan imported from Excel (${action}).`});
        results.push({row:rowNo,loan_account_no:loanNo,status:action});
      }catch(e){ results.push({row:rowNo,loan_account_no:clean(r.loan_account_no),status:'error',error:e.message||'Import failed'}); }
    }
    return res.status(200).json({success:true,created,updated,failed:results.filter(x=>x.status==='error').length,results});
  }catch(e){console.error('[admin/import-loan-cases]',e);return sendError(res,500,'Could not import loan cases.');}
}
