// Shared constants and utilities

export const FIPS_TO_STATE = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE",
  "11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA",
  "20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN",
  "28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM",
  "36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
  "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA",
  "54":"WV","55":"WI","56":"WY"
};

export const S_COLORS = { done:'#34d399', needs_tiebreaker:'#a78bfa', '1_pass':'#60a5fa', '0_passes':'#1e2030' };
export const S_LABELS = { done:'Complete', needs_tiebreaker:'Needs 3rd Pass', '1_pass':'Needs 2nd Pass', '0_passes':'Not Started' };
export const C_COLORS = { all_done:'#34d399', some_done:'#2a8a6a', some_started:'#3b5998', not_started:'#1a1f2e' };
export const C_LABELS = { all_done:'All Complete', some_done:'Some Complete', some_started:'Some Started', not_started:'Not Started' };
export const TYPE_COLORS = ['#6c8cff','#34d399','#fbbf24','#a78bfa','#fb923c','#f87171','#60a5fa','#f472b6','#22d3ee','#84cc16'];

export const LAW_TYPES = [
  { key: 'smokefree_outdoor', label: 'Smokefree Outdoor', color: '#6c8cff' },
  { key: 'smokefree_indoor', label: 'Smokefree Indoor', color: '#34d399' },
  { key: 'tobacco_retail_sales', label: 'Tobacco Retail Sales', color: '#fbbf24' },
  { key: 'flavored_tobacco_ban', label: 'Flavored Tobacco Ban', color: '#a78bfa' },
  { key: 'smokefree_multiunit_housing', label: 'Smokefree Housing', color: '#fb923c' },
  { key: 'retailer_density_proximity', label: 'Retailer Density', color: '#f87171' },
  { key: 'excise_tax', label: 'Local Excise Tax', color: '#60a5fa' },
];

export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function truncUrl(u) {
  try {
    const url = new URL(u);
    return url.hostname + (url.pathname.length > 25 ? url.pathname.slice(0, 25) + '...' : url.pathname);
  } catch {
    return u.length > 45 ? u.slice(0, 45) + '...' : u;
  }
}

export function isErrorNote(text) {
  return text && /\[ERROR:/i.test(text);
}

export function statusRank(s) {
  return { done: 3, needs_tiebreaker: 2, '1_pass': 1, '0_passes': 0 }[s] || 0;
}

export function computeCountyStatus(statuses) {
  if (statuses.length === 0) return 'not_started';
  const allDone = statuses.every(s => s === 'done');
  const hasDone = statuses.some(s => s === 'done');
  const hasStarted = statuses.some(s => s === 'done' || s === 'needs_tiebreaker' || s === '1_pass');
  if (allDone) return 'all_done';
  if (hasDone) return 'some_done';
  if (hasStarted) return 'some_started';
  return 'not_started';
}

export function stateAggStatus(stateData) {
  const js = stateData.jur_status || {};
  const total = stateData.jurisdiction_count || 0;
  if (total === 0) return 'not_started';
  const done = js.done || 0;
  const started = done + (js.needs_tiebreaker || 0) + (js['1_pass'] || 0);
  if (done === total) return 'all_done';
  if (done > 0) return 'some_done';
  if (started > 0) return 'some_started';
  return 'not_started';
}

export function getStateFips(abbrev) {
  return Object.entries(FIPS_TO_STATE).find(([k, v]) => v === abbrev)?.[0];
}

export function getStateCounties(usTopo, stFips) {
  const allCounties = topojson.feature(usTopo, usTopo.objects.counties).features;
  return allCounties.filter(d => d.id.toString().padStart(5, '0').startsWith(stFips));
}

export function assignJursToCounties(jurs, stateCounties) {
  const countyJurs = {};
  for (const cty of stateCounties) {
    countyJurs[cty.id.toString().padStart(5, '0')] = [];
  }
  for (const j of jurs) {
    const cf = j.county_fips;
    if (cf && countyJurs[cf] !== undefined) {
      countyJurs[cf].push(j);
    } else if (j.lat && j.lon) {
      for (const cty of stateCounties) {
        if (d3.geoContains(cty, [j.lon, j.lat])) {
          countyJurs[cty.id.toString().padStart(5, '0')].push(j);
          break;
        }
      }
    }
  }
  return countyJurs;
}

export function buildCountyNames(jurs) {
  const names = {};
  for (const j of jurs) {
    if (j.county_fips && j.name && j.name.includes('County')) {
      names[j.county_fips] = j.name.replace(/, [A-Za-z]+$/, '');
    }
  }
  return names;
}

export function categorize(lawType) {
  if (!lawType) return null;
  const lt = lawType.toLowerCase();
  for (const t of LAW_TYPES) {
    if (lt === t.key || lt.startsWith(t.key)) return t.key;
  }
  if (lt.includes('smokefree') && lt.includes('outdoor')) return 'smokefree_outdoor';
  if (lt.includes('smokefree') && lt.includes('indoor')) return 'smokefree_indoor';
  if (lt.includes('smokefree') && lt.includes('housing')) return 'smokefree_multiunit_housing';
  if (lt.includes('smokefree') && lt.includes('multi')) return 'smokefree_multiunit_housing';
  if (lt.includes('retail') && lt.includes('density')) return 'retailer_density_proximity';
  if (lt.includes('retail') || lt.includes('sales') || lt.includes('license')) return 'tobacco_retail_sales';
  if (lt.includes('flavor')) return 'flavored_tobacco_ban';
  if (lt.includes('tax') || lt.includes('excise')) return 'excise_tax';
  if (lt.includes('smokefree') || lt.includes('smoking') || lt.includes('smoke')) return 'smokefree_outdoor';
  return null;
}

export function getTypeInfo(key) {
  return LAW_TYPES.find(t => t.key === key) || { key, label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), color: '#8b8fa3' };
}

// Load data + topology in parallel
export async function loadData() {
  const [data, us] = await Promise.all([
    fetch('dashboard_data.json').then(r => r.json()),
    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json').then(r => r.json()),
  ]);
  return { data, us };
}

export function buildOrdCard(o) {
  const lt = (o.law_type || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const parts = [];
  if (o.effective_date) parts.push(`Effective ${esc(o.effective_date)}`);
  else if (o.adoption_date) parts.push(`Adopted ${esc(o.adoption_date)}`);
  if (o.ordinance_number) parts.push(`Ord. ${esc(o.ordinance_number)}`);
  if (o.source_url) parts.push(`<a href="${esc(o.source_url)}" target="_blank" onclick="event.stopPropagation()">${truncUrl(o.source_url)}</a>`);
  return `<div class="ord-card">
    <div class="ord-type">${lt}</div>
    ${o.description ? `<div class="ord-desc">${esc(o.description)}</div>` : ''}
    ${parts.length ? `<div class="ord-meta">${parts.join(' &middot; ')}</div>` : ''}
  </div>`;
}

// Parse date string to comparable integer (YYYYMMDD)
export function parseDate(dateStr) {
  if (!dateStr) return null;
  // Handle various formats: YYYY-MM-DD, MM/YYYY, YYYY, MM/DD/YYYY
  const s = dateStr.trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return parseInt(m[1] + m[2] + m[3]);
  if ((m = s.match(/^(\d{2})\/(\d{4})$/))) return parseInt(m[2] + m[1] + '01');
  if ((m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) return parseInt(m[3] + m[1] + m[2]);
  if ((m = s.match(/^(\d{4})$/))) return parseInt(m[1] + '0101');
  return null;
}

export function formatDateInt(d) {
  const s = d.toString().padStart(8, '0');
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
}
