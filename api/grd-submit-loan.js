// Direct Vercel function for the GRD -> CHFPL loan bridge.
// This top-level API route intentionally avoids the grouped /api/dealer rewrite.
import handler from '../lib/api/dealer/grd-submit-loan.js';

export default handler;
