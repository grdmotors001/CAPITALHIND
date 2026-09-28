// Notify GRD of a CHFPL loan status change.
// The webhook is deliberately idempotent: GRD upserts the status by chfpl_loan_id.
// Failures are retried here so a temporary GRD outage does not lose the status event.

export async function notifyGrdLoanStatus({ chfplLoanId, status }) {
  const base = String(process.env.GRD_WEBHOOK_URL || '').replace(/\/$/, '');
  const secret = String(process.env.CHFPL_GRD_BRIDGE_SECRET || '').trim();
  if (!base || !secret || !chfplLoanId || !status) return false;

  const payload = JSON.stringify({
    chfpl_loan_id: Number(chfplLoanId),
    status: String(status).trim(),
  });

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(base + '/api/loan-status-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-grd-bridge-secret': secret,
        },
        body: payload,
        signal: controller.signal,
        cache: 'no-store',
      });
      if (response.ok) return true;
      lastError = new Error(`GRD webhook returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }

  console.error('[CHFPL->GRD loan-status-webhook] failed after 3 attempts', lastError?.message || lastError);
  return false;
}
