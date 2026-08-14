import { supabase } from './supabase.js';
import { neighborhoods } from '../data/neighborhoods.js';
import averyRanch from '../data/avery-ranch.json';
import circleC from '../data/circle-c.json';
import onionCreek from '../data/onion-creek.json';
import sunfield from '../data/sunfield.json';

export const fallbackGroupsBySlug = {
  'avery-ranch': averyRanch,
  'circle-c': circleC,
  'onion-creek': onionCreek,
  'sunfield': sunfield,
};

export async function getNeighborhoodDataPaths() {
  let groupRows = null;
  let subRows = null;
  let nsRows = null;
  let listingRows = null;

  try {
    const res1 = await supabase.from('groups').select('id, slug, label, icon').order('sort_order');
    const res2 = await supabase.from('subcategories').select('id, group_id, name, icon').order('sort_order');
    const res3 = await supabase.from('neighborhood_subcategories').select('neighborhood_slug, subcategory_id');
    const res4 = await supabase.from('listings').select('*').order('featured', { ascending: false }).order('sort_order', { ascending: true }).order('name', { ascending: true });

    groupRows = res1.data;
    subRows = res2.data;
    nsRows = res3.data;
    listingRows = res4.data;
  } catch (e) {
    console.warn('Supabase build fetch notice:', e);
  }

  const hasDbData = groupRows && subRows && nsRows && listingRows;

  return neighborhoods.map((n) => {
    let groups = [];

    if (hasDbData) {
      const enabledSubIds = new Set(
        (nsRows || []).filter((r) => r.neighborhood_slug === n.slug).map((r) => r.subcategory_id)
      );

      groups = (groupRows || []).map((g) => ({
        id: g.slug,
        label: g.label,
        icon: g.icon,
        subcategories: (subRows || [])
          .filter((s) => s.group_id === g.id && enabledSubIds.has(s.id))
          .map((s) => ({
            name: s.name,
            icon: s.icon,
            listings: (listingRows || [])
              .filter((l) => l.subcategory_id === s.id && l.neighborhood_slug === n.slug)
              .sort((a, b) => {
                if (a.featured && !b.featured) return -1;
                if (!a.featured && b.featured) return 1;
                const sa = a.sort_order ?? 0;
                const sb = b.sort_order ?? 0;
                if (sa !== sb) return sa - sb;
                return (a.name || '').localeCompare(b.name || '');
              })
              .map((l) => ({
                name: l.name,
                phone: l.phone,
                note: l.note,
                ...(l.email ? { email: l.email } : {}),
                ...(l.website ? { website: l.website } : {}),
                ...(l.featured ? { featured: true } : {}),
              })),
          })),
      }));
    } else {
      groups = fallbackGroupsBySlug[n.slug] || [];
    }

    return { params: { neighborhood: n.slug }, props: { neighborhood: n, groups } };
  });
}
