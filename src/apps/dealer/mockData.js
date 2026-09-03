// TEMP mock data — replace with a real API call once backend is wired:
//   GET /api/dealer/vehicle-models
//   -> SELECT vmm.* FROM dealer_vehicle_mapping dvm
//      JOIN vehicle_model_master vmm ON vmm.id = dvm.vehicle_model_id
//      WHERE dvm.dealer_id = :current_dealer_id AND dvm.is_active = 1

export const MOCK_VEHICLE_MODELS = [
  { id: 1, model_name: 'GRD Volt 2W', vehicle_type: '2W', ex_showroom_price: 95000 },
  { id: 2, model_name: 'GRD Spark 2W', vehicle_type: '2W', ex_showroom_price: 110000 },
  { id: 3, model_name: 'GRD Cargo 3W', vehicle_type: '3W', ex_showroom_price: 285000 },
];

export const KYC_DOC_TYPES = [
  { value: 'pan', label: 'PAN Card' },
  { value: 'aadhaar_front', label: 'Aadhaar (Front)' },
  { value: 'aadhaar_back', label: 'Aadhaar (Back)' },
  { value: 'photo', label: 'Photograph' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'other', label: 'Other' },
];
