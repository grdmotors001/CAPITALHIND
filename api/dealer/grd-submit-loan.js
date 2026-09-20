// Direct Vercel function for the GRD -> CHFPL loan bridge.
// Kept as a direct file route so /api/dealer/grd-submit-loan does not depend
// on the grouped /api/dealer rewrite.
import handler from '../../lib/api/dealer/grd-submit-loan.js';

export default handler;
