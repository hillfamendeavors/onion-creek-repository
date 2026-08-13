import { supabase } from '../lib/supabase.js';

async function loadOverview() {
  const statUsers = document.getElementById('statUsers');
  const statOpenRequests = document.getElementById('statOpenRequests');
  const statPendingReferrals = document.getElementById('statPendingReferrals');
  if (!statUsers || !statOpenRequests || !statPendingReferrals) return;

  const [usersRes, requestsRes, referralsRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).neq('status', 'closed'),
    supabase.from('referral_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'new'),
  ]);

  statUsers.textContent = usersRes.count ?? '—';
  statOpenRequests.textContent = requestsRes.count ?? '—';
  statPendingReferrals.textContent = referralsRes.count ?? '—';
}

window.addEventListener('overview-tab-shown', loadOverview);

if (document.getElementById('appView')) {
  loadOverview();
}
