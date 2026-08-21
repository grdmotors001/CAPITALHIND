import { Link } from 'react-router-dom';

// WIREFRAME — Dealer App
// Aligned with Phase 10 (Dealer Loan Application Portal) schema:
// loan_applications, kyc_documents, guarantor_details, dealer_vehicle_mapping,
// application_status_history, dealer_incentives.

export default function DealerDashboard() {
  return (
    <div className="app-shell">
      <header className="app-header">Dealer App</header>
      <main className="app-body">
        <Link to="/app/dealer/new-application" className="primary-button dashboard-cta">
          + New loan application
        </Link>
        <section className="wireframe-block">Select Vehicle Model (dealer_vehicle_mapping)</section>
        <section className="wireframe-block">Application Status Tracker (application_status_history)</section>
        <section className="wireframe-block">Sanction / Disbursement Status (sanction_records)</section>
        <section className="wireframe-block">Incentive Statement (dealer_incentives)</section>
      </main>
    </div>
  );
}
