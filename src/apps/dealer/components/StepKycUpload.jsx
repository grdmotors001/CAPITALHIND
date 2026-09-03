import { KYC_DOC_TYPES } from '../mockData';

// Maps to: kyc_documents table (one row per uploaded doc, doc_type + file_path)
// Required: pan, aadhaar_front, aadhaar_back, photo, address_proof

const REQUIRED_DOCS = ['pan', 'aadhaar_front', 'aadhaar_back', 'photo', 'address_proof'];

export default function StepKycUpload({ data, onChange, errors }) {
  const docs = data.documents || {};

  function handleFile(docType, file) {
    if (!file) return;
    onChange({
      ...data,
      documents: {
        ...docs,
        [docType]: { file_name: file.name, file }, // file_path assigned server-side on upload
      },
    });
  }

  return (
    <div className="form-step">
      <h3>KYC documents</h3>
      <p className="step-note">
        Required: {REQUIRED_DOCS.map((d) => KYC_DOC_TYPES.find((t) => t.value === d).label).join(', ')}
      </p>

      <div className="doc-upload-list">
        {KYC_DOC_TYPES.map((t) => (
          <div key={t.value} className="doc-upload-row">
            <div className="doc-upload-label">
              {t.label}
              {REQUIRED_DOCS.includes(t.value) && <span className="required-dot">*</span>}
            </div>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFile(t.value, e.target.files[0])}
            />
            {docs[t.value] && <span className="doc-uploaded-name">{docs[t.value].file_name}</span>}
          </div>
        ))}
      </div>

      {errors.documents && <span className="field-error">{errors.documents}</span>}
    </div>
  );
}
