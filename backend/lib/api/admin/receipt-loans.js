// GET /api/admin/receipt-loans — loans available for receipt entry and printing.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req,res){
  if(!methodGuard(req,res,'GET'))return;
  const session=requireAdminAuth(req,res); if(!session)return;
  try{
    const supabase=getSupabase();
    const {data,error}=await supabase.from('loan_applications').select(`
      id, application_no, loan_account_no, application_status, loan_amount_requested, tenure_months,
      vehicle_price, down_payment, created_at, approved_at, approval_valid_until, disbursement_date, disbursed_amount,
      vehicle_no, chassis_no, ledger_no, file_no, file_record_no, case_status, hypothecation, do_no, case_received_date,
      fi_send_date, fi_received_date, fi_status, fi_executive_name, sanction_date, approved_by, file_received_date, file_check_date,
      interest_rate, interest_amount, principal_amount, emi_no, emi_amount, vehicle_registration_date,
      customer_profiles(full_name,phone,email,dob,gender,pan,aadhaar_masked,address,city,state,pincode,occupation,monthly_income,ownership_status,landmark,electricity_ca_no),
      dealer_master(dealer_name,dealer_code),
      vehicle_model_master(model_name,vehicle_type,ex_showroom_price,oem_id)
    `).not('loan_account_no','is',null).order('created_at',{ascending:false}).limit(500);
    if(error){console.error('[admin/receipt-loans]',error.message);return sendError(res,500,'Could not load loans for receipt entry.');}

    const rows=data||[];
    const ids=rows.map(r=>r.id);
    const oemIds=[...new Set(rows.map(r=>r.vehicle_model_master?.oem_id).filter(Boolean))];

    const [gRes,cbRes,oRes]=await Promise.all([
      ids.length ? supabase.from('guarantor_details').select('loan_application_id,full_name,relation_with_customer,phone,address,pan,aadhaar_masked,ownership_status,landmark,electricity_ca_no').in('loan_application_id',ids) : Promise.resolve({data:[],error:null}),
      ids.length ? supabase.from('co_borrower_details').select('loan_application_id,full_name,relation_with_customer,phone,email,dob,gender,address,city,state,pincode,pan,aadhaar_masked,occupation,monthly_income,ownership_status,landmark,electricity_ca_no').in('loan_application_id',ids) : Promise.resolve({data:[],error:null}),
      oemIds.length ? supabase.from('vehicle_oem_master').select('id,oem_name').in('id',oemIds) : Promise.resolve({data:[],error:null}),
    ]);
    if(gRes.error) console.warn('[admin/receipt-loans] guarantor lookup:',gRes.error.message);
    if(oRes.error) console.warn('[admin/receipt-loans] oem lookup:',oRes.error.message);

    const guarantorMap={};
    (gRes.data||[]).forEach(g=>{(guarantorMap[g.loan_application_id] ||= []).push(g);});
    const coBorrowerMap={};
    (cbRes.data||[]).forEach(cb=>{coBorrowerMap[cb.loan_application_id]=cb;});
    const oemMap={};
    (oRes.data||[]).forEach(o=>{oemMap[o.id]=o.oem_name;});

    const loans=rows.map(r=>({
      id:r.id, application_no:r.application_no, loan_account_no:r.loan_account_no,
      application_status:r.application_status, loan_amount_requested:r.loan_amount_requested, tenure_months:r.tenure_months,
      vehicle_price:r.vehicle_price, down_payment:r.down_payment, created_at:r.created_at, approved_at:r.approved_at,
      approval_valid_until:r.approval_valid_until, disbursement_date:r.disbursement_date, disbursed_amount:r.disbursed_amount,
      vehicle_no:r.vehicle_no, chassis_no:r.chassis_no, ledger_no:r.ledger_no, file_no:r.file_no, file_record_no:r.file_record_no,
      case_status:r.case_status, hypothecation:r.hypothecation, do_no:r.do_no, case_received_date:r.case_received_date,
      fi_send_date:r.fi_send_date, fi_received_date:r.fi_received_date, fi_status:r.fi_status, fi_executive_name:r.fi_executive_name,
      sanction_date:r.sanction_date, approved_by:r.approved_by, file_received_date:r.file_received_date, file_check_date:r.file_check_date,
      interest_rate:r.interest_rate, interest_amount:r.interest_amount, principal_amount:r.principal_amount, emi_no:r.emi_no, emi_amount:r.emi_amount,
      vehicle_registration_date:r.vehicle_registration_date,
      customer_name:r.customer_profiles?.full_name||null,
      customer_phone:r.customer_profiles?.phone||null,
      customer:r.customer_profiles||{},
      dealer_name:r.dealer_master?.dealer_name||null,
      dealer:r.dealer_master||{},
      vehicle_model:r.vehicle_model_master?.model_name||null,
      vehicle:{...(r.vehicle_model_master||{}),oem_name:oemMap[r.vehicle_model_master?.oem_id]||null},
      guarantors:guarantorMap[r.id]||[],
      co_borrower:coBorrowerMap[r.id]||null,
    }));
    return res.status(200).json({success:true,loans});
  }catch(e){console.error('[admin/receipt-loans] unhandled',e);return sendError(res,500,'Could not load loans for receipt entry.');}
}
