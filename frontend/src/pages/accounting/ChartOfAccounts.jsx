// WIREFRAME — Chart of Accounts
// Real scope: hierarchical account list (Asset/Liability/Income/Expense/Equity),
// account code, opening balance, add/edit account.

export default function ChartOfAccounts() {
  return (
    <div className="page-wireframe">
      <h2>Chart of Accounts</h2>
      <section className="wireframe-block">Account groups (Asset / Liability / Income / Expense / Equity)</section>
      <section className="wireframe-block">Account list table (code, name, group, opening balance)</section>
      <section className="wireframe-block">Add / Edit Account (form)</section>
    </div>
  );
}
