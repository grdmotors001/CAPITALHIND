// api/_lib/validate.js
// Direct JS port of the original api/includes/validate.php — same rules.

export function validateCustomer(c = {}) {
  const errors = [];
  if (!c.full_name) errors.push('full_name is required');
  if (!c.phone || !/^\d{10}$/.test(c.phone)) errors.push('valid 10-digit phone is required');
  if (!c.dob) errors.push('dob is required');
  if (!c.pan || !/^[A-Z]{5}\d{4}[A-Z]$/.test(c.pan)) errors.push('valid PAN is required');
  if (!c.aadhaar || !/^\d{12}$/.test(c.aadhaar)) errors.push('valid 12-digit Aadhaar is required');
  if (!c.pincode || !/^\d{6}$/.test(c.pincode)) errors.push('valid 6-digit pincode is required');
  if (!c.address) errors.push('address is required');
  return errors;
}

export function validateVehicleLoan(v = {}) {
  const errors = [];
  if (!v.vehicle_model_id) errors.push('vehicle_model_id is required');
  if (v.vehicle_price === undefined || Number(v.vehicle_price) <= 0) errors.push('vehicle_price must be > 0');
  if (v.down_payment === undefined || Number(v.down_payment) < 0) errors.push('down_payment is required');
  if (v.vehicle_price !== undefined && v.down_payment !== undefined &&
      Number(v.down_payment) >= Number(v.vehicle_price)) {
    errors.push('down_payment must be less than vehicle_price');
  }
  if (!v.tenure_months) errors.push('tenure_months is required');
  return errors;
}

export function validateGuarantors(guarantors = []) {
  const errors = [];
  if (!guarantors.length) {
    errors.push('at least one guarantor is required');
    return errors;
  }
  guarantors.forEach((g, i) => {
    if (!g.full_name) errors.push(`guarantor[${i}].full_name is required`);
    if (!g.phone || !/^\d{10}$/.test(g.phone)) {
      errors.push(`guarantor[${i}].phone must be a valid 10-digit number`);
    }
  });
  return errors;
}

export async function generateApplicationNo(supabase) {
  const year = new Date().getFullYear();
  const prefix = `CHF-${year}-`;
  const { count, error } = await supabase
    .from('loan_applications')
    .select('id', { count: 'exact', head: true })
    .like('application_no', `${prefix}%`);
  if (error) throw error;
  const next = (count || 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}
