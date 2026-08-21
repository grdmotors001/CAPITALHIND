// WIREFRAME — Tele Caller App
// Real scope (fill in later): call queue (overdue/reminders), call disposition
// form, callback scheduling, daily call target vs achieved.

export default function TeleCallerDashboard() {
  return (
    <div className="app-shell">
      <header className="app-header">Tele Caller App</header>
      <main className="app-body">
        <section className="wireframe-block">Call Queue (overdue customers)</section>
        <section className="wireframe-block">Call Disposition (form)</section>
        <section className="wireframe-block">Callback Scheduler</section>
        <section className="wireframe-block">Daily Target vs Achieved</section>
      </main>
    </div>
  );
}
