import { getStore } from '@netlify/blobs';

// Fixed-window per-key rate limiter backed by Netlify Blobs — the native
// persistence primitive for Netlify Functions, so this needs no new external
// service. Used to blunt anonymous abuse of public-facing endpoints without
// requiring a login (some forms on this site are intentionally open to
// logged-out visitors, e.g. "Suggest a Referral").
export async function checkRateLimit(storeName, key, { max, windowMs }) {
  // If we can't identify the caller (e.g. a proxy stripped every IP header),
  // fail open — better to let a rare unidentifiable request through than to
  // block real traffic entirely.
  if (!key) return true;

  try {
    const store = getStore(storeName);
    const now = Date.now();
    const existing = await store.get(key, { type: 'json' });

    const withinWindow = existing && now - existing.windowStart < windowMs;
    const count = withinWindow ? existing.count : 0;

    if (withinWindow && count >= max) {
      return false;
    }

    await store.setJSON(key, {
      windowStart: withinWindow ? existing.windowStart : now,
      count: count + 1,
    });
    return true;
  } catch (e) {
    // Fail open: a Blobs outage or missing site configuration shouldn't take
    // down a currently-working, intentionally-anonymous form. This limiter
    // is a hardening layer, not the feature's correctness guarantee.
    console.warn('Rate limit check failed, allowing request through:', e.message);
    return true;
  }
}

export function getClientIp(event) {
  const forwarded = event.headers['x-nf-client-connection-ip']
    || event.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : null;
}
