// The Bleed: news from across Cursive, and opportunities she can apply to. Editorial adds them; everyone sees the same list until
// she signs in and agrees to the use of her reading data (§7 of the companion document), so nothing here is personal.
// Pure validation, free of Express and Mongoose.

const KINDS = ['news', 'opportunity'];
// opportunities include competitions, jobs, grants, people to meet and communities, from anywhere in the world
const OPPORTUNITY_TYPES = ['competition', 'job', 'grant', 'person', 'community', 'other'];
const isString = (value) => typeof value === 'string';

function cleanUrl(value) {
  if (!isString(value) || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// returns { error: { field, message } } or { value }
function validateBleedItem(body) {
  const kind = isString(body?.kind) ? body.kind : '';
  const title = isString(body?.title) ? body.title.trim() : '';
  const summary = isString(body?.summary) ? body.summary.trim() : '';
  const url = cleanUrl(body?.url);
  if (!KINDS.includes(kind)) return { error: { field: 'kind', message: 'Choose news or opportunity.' } };
  if (!title) return { error: { field: 'title', message: 'Give the item a title.' } };
  if (title.length > 140) return { error: { field: 'title', message: 'Use 140 characters or fewer.' } };
  if (summary.length > 400) return { error: { field: 'summary', message: 'Use 400 characters or fewer.' } };
  if (url === null) return { error: { field: 'url', message: 'Use a web address that starts with https://.' } };
  let type = '';
  if (kind === 'opportunity') {
    type = isString(body?.type) ? body.type : 'other';
    if (!OPPORTUNITY_TYPES.includes(type)) return { error: { field: 'type', message: 'Choose a kind of opportunity.' } };
  }
  let endsAt = null;
  if (body?.endsAt) {
    endsAt = new Date(body.endsAt);
    if (Number.isNaN(endsAt.getTime())) return { error: { field: 'endsAt', message: 'Use a real date.' } };
  }
  return { value: { kind, type, title, summary, url, endsAt } };
}

// the items everyone sees: no end date, or an end date still ahead
const activeFilter = (now = new Date()) => ({ $or: [{ endsAt: null }, { endsAt: { $gt: now } }] });

// what leaves the server: only the public fields
const publicItem = (item) => ({ id: String(item._id), kind: item.kind, type: item.type, title: item.title, summary: item.summary, url: item.url, createdAt: item.createdAt });

module.exports = { KINDS, OPPORTUNITY_TYPES, validateBleedItem, activeFilter, publicItem };
