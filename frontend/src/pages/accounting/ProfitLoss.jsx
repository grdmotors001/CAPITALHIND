// WIREFRAME — Profit & Loss
// Real scope: period-based P&L statement, income vs expense grouped by account head.

export default function ProfitLoss() {
  return (
    <div className="page-wireframe">
      <h2>Profit & Loss</h2>
      <section className="wireframe-block">Period selector (month / quarter / year)</section>
      <section className="wireframe-block">Income summary (by account head)</section>
      <section className="wireframe-block">Expense summary (by account head)</section>
      <section className="wireframe-block">Net profit / loss total</section>
    </div>
  );
}
