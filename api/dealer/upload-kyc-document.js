// POST /api/dealer/upload-kyc-document  (multipart/form-data)
//   loan_application_id  (required)
//   customer_id           (required)
//   doc_type               (required — one of KYC_DOC_TYPES)
//   file                    (the uploaded file, required)
//
// Vercel functions have no persistent local disk, so files go to Supabase
// Storage (bucket "kyc-documents") instead of api/uploads/kyc/ like the
// original PHP version. Create that bucket (private) in the Supabase
// dashboard before using this endpoint.

import formidable from 'formidable';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendError, methodGuard } from '../_lib/auth.js';

export const config = {
  api: { bodyParser: false },
};

const ALLOWED_DOC_TYPES = [
  'pan', 'aadhaar_front', 'aadhaar_back', 'photo',
  'address_proof', 'income_proof', 'bank_statement', 'other',
];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'kyc-documents';

function parseForm(req) {
  const form = formidable({ maxFileSize: MAX_FILE_SIZE_BYTES, multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireDealerAuth(req, res);
  if (!session) return;

  let fields, files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (e) {
    return sendError(res, 422, 'File too large or upload failed (max 5 MB)');
  }

  const loanApplicationId = parseInt(fields.loan_application_id?.[0] ?? fields.loan_application_id, 10);
  const customerId = parseInt(fields.customer_id?.[0] ?? fields.customer_id, 10);
  const docType = fields.doc_type?.[0] ?? fields.doc_type;
  const file = Array.isArray(files.file) ? files.file[0] : files.file;

  if (!loanApplicationId || !customerId) {
    return sendError(res, 422, 'loan_application_id and customer_id are required');
  }
  if (!ALLOWED_DOC_TYPES.includes(docType)) {
    return sendError(res, 422, 'Invalid doc_type');
  }
  if (!file) {
    return sendError(res, 422, 'File upload failed or missing');
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return sendError(res, 422, 'Only JPG, PNG, or PDF files are allowed');
  }

  try {
    const supabase = getSupabase();

    // Authorization check: application must belong to this dealer.
    const { data: application, error: appErr } = await supabase
      .from('loan_applications')
      .select('id')
      .eq('id', loanApplicationId)
      .eq('dealer_id', session.dealer_id)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!application) return sendError(res, 404, 'Loan application not found');

    const extension = (file.originalFilename || '').split('.').pop() || 'bin';
    const safeName = `${crypto.randomBytes(16).toString('hex')}.${extension.toLowerCase()}`;
    const storagePath = `${loanApplicationId}/${safeName}`;
    const fileBuffer = fs.readFileSync(file.filepath);

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, { contentType: file.mimetype, upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: docRow, error: insertErr } = await supabase
      .from('kyc_documents')
      .insert({
        loan_application_id: loanApplicationId,
        customer_id: customerId,
        doc_type: docType,
        file_path: storagePath,
        file_name: file.originalFilename || safeName,
        uploaded_by: session.dealer_user_id,
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    return res.status(200).json({
      success: true,
      kyc_document_id: docRow.id,
      doc_type: docType,
    });
  } catch (e) {
    console.error('[upload-kyc-document]', e.message || e);
    return sendError(res, 500, 'Could not process document upload');
  }
}
