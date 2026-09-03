// WIREFRAME — Bank Book
// Real scope: bank account-wise transactions, running balance, reconciliation status.

export default function BankBook() {
  return (
    <div className="page-wireframe">
      <h2>Bank Book</h2>
      <section className="wireframe-block">Bank account selector</section>
      <section className="wireframe-block">Bank transactions table (date, particulars, debit, credit, balance, reconciled)</section>
      <section className="wireframe-block">New Bank Entry (form)</section>
    </div>
  );
}
