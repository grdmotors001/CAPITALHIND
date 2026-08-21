// WIREFRAME — Customer Payment App
// Real scope (fill in later): outstanding EMI view, pay now (Cashfree/UPI),
// payment history, digital receipt download.

export default function CustomerPaymentDashboard() {
  return (
    <div className="app-shell">
      <header className="app-header">Customer Payment App</header>
      <main className="app-body">
        <section className="wireframe-block">Outstanding EMI (amount + due date)</section>
        <section className="wireframe-block">Pay Now (UPI / Card / Net Banking)</section>
        <section className="wireframe-block">Payment History</section>
        <section className="wireframe-block">Digital Receipts (download)</section>
      </main>
    </div>
  );
}
