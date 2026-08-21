// WIREFRAME — Balance Sheet
// Real scope: assets vs liabilities + equity as of a given date, must balance.

export default function BalanceSheet() {
  return (
    <div className="page-wireframe">
      <h2>Balance Sheet</h2>
      <section className="wireframe-block">As-of date selector</section>
      <section className="wireframe-block">Assets (current + fixed)</section>
      <section className="wireframe-block">Liabilities + Equity</section>
      <section className="wireframe-block">Totals check (must balance)</section>
    </div>
  );
}
