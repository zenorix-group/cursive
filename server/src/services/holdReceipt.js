const { HOLD_DATA } = require('../lib/holdData');
const { httpError } = require('./gemini');

// Article 3, "The Hold": the receipt. Every value is a lookup, a count or a test against the 10 to 15 per cent rule, made from the
// holds she played (the last release or the end of each); the sentences are then put together from them. Nothing is sent to a model.

const HOLD_IDS = ['h1', 'h2', 'h3'];
const RANGE = { low: 10, high: 15 };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ₹1,04,300: rupees with Indian grouping (last three digits, then pairs)
function rupees(value) {
  const digits = String(Math.round(value));
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `₹${rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},` : ''}${last3}`;
}
const share = (value) => value.toFixed(1);
const weekMonth = (id, week) => {
  const [year, month] = HOLD_DATA[id].weeks[week];
  return `${MONTHS[month - 1]} ${year}`;
};
const weekFigures = (id, week) => {
  const [, , value, pct] = HOLD_DATA[id].weeks[week];
  return { value: rupees(value), share: share(pct) };
};

const outside = (pct) => pct < RANGE.low || pct > RANGE.high

// What the rule says about one played hold, and how her move compares. Letting go is acting; reaching the full stop is holding.
function judgeHold(id, result) {
  const weeks = HOLD_DATA[id].weeks
  const start = weeks[0][2]
  const firstOut = weeks.findIndex((w) => outside(w[3]))
  const week = result.action === 'end' ? weeks.length - 1 : result.week
  const [, , value, pct] = weeks[week]
  const acted = result.action === 'release'
  const priceMove = value < start ? 'fall' : 'rise'
  // the rule: act only once the share has left 10 to 15 per cent; otherwise hold to the end
  const ruleAsked = acted ? (outside(pct) ? 'act' : 'wait') : (firstOut === -1 ? 'wait' : 'act')
  const fits = acted ? outside(pct) : firstOut === -1
  return {
    id, week, acted, priceMove, ruleAsked, fits,
    value, pct, monthLabel: weekMonth(id, week),
    endValue: weeks[weeks.length - 1][2], endPct: weeks[weeks.length - 1][3],
    lowValue: Math.min(...weeks.map((w) => w[2])), highValue: Math.max(...weeks.map((w) => w[2])),
    firstOut: firstOut === -1 ? null : { week: firstOut, label: weekMonth(id, firstOut), pct: weeks[firstOut][3], above: weeks[firstOut][3] > RANGE.high },
    leftRange: outside(pct),
  }
}

// her habit across the holds she played, in one of six words
function habitOf(judged) {
  if (!judged.length) return 'none'
  if (judged.every((j) => j.fits)) return 'range'
  if (judged.every((j) => !j.acted)) return 'still'
  if (judged.every((j) => j.acted)) return 'every'
  if (judged.every((j) => (j.priceMove === 'fall') === j.acted)) return 'price'
  if (judged.every((j) => (j.priceMove === 'rise') === j.acted)) return 'rises'
  return 'mixed'
}

const HABITS = {
  range: 'You followed the range. Each time, what you did matched where your share stood against 10 to 15 per cent.',
  price: 'You followed the price. You let go while the money was falling and held on while it was rising, whatever your share said.',
  still: 'You sat still. You held every year to its full stop, without letting go.',
  rises: 'You let go whenever the money was rising, and held on when it fell.',
  every: 'You let go every time, in every year you played.',
  mixed: 'You have no single habit yet. Your moves did not follow the range, and they did not follow the price either.',
  none: 'You did not play any of the holds, so there is no pattern to describe yet.',
}


// what the market did in each year, in plain words
const MARKET = {
  h1: 'American shares fell hard in the pandemic crash of early 2020, then climbed back.',
  h2: 'American shares ended 2011 close to where they began, while Indian shares slid, so your share abroad crept up.',
  h3: 'American technology shares fell through 2022, after two boom years.',
}

// one short story per year, told from her side: what happened in the market, what she saw, when she acted, what the rule asked,
// whether she followed it and what that suggests about her
function yearStory(id, result) {
  const data = HOLD_DATA[id]
  const lows = Math.min(...data.weeks.map((w) => w[2]))
  const highs = Math.max(...data.weeks.map((w) => w[2]))
  const market = `${MARKET[id]} Your ₹1 lakh moved between ${rupees(lows)} and ${rupees(highs)}, and it ended at ${rupees(data.weeks.at(-1)[2])}.`
  if (!result) return { id, played: false, title: data.label, lines: [`${market} You skipped this year, so you did not see it play.`] }

  const j = judgeHold(id, result)
  const watched = j.acted
    ? `You watched it play to ${j.monthLabel}, when it stood at ${rupees(j.value)} and your share at ${share(j.pct)} per cent.`
    : `You watched the whole year play, to ${rupees(j.endValue)} and ${share(j.endPct)} per cent in December.`
  const when = j.acted ? `You let go in ${j.monthLabel}.` : 'You held to the full stop, through to December.'
  const rule = j.acted
    ? `The rule asks you to act only once your share leaves 10 to 15 per cent. In ${j.monthLabel} yours was ${share(j.pct)}, ${j.leftRange ? 'outside' : 'inside'} that range, so the rule said ${j.leftRange ? 'act' : 'hold'}.`
    : j.firstOut
      ? `The rule asks you to act only once your share leaves 10 to 15 per cent. Yours first did in ${j.firstOut.label}, at ${share(j.firstOut.pct)}, so the rule said act then.`
      : 'The rule asks you to act only once your share leaves 10 to 15 per cent. Yours never did, so the rule said hold.'
  const followed = j.fits
    ? 'Your decision followed the rule.'
    : j.acted ? 'Your decision did not follow the rule: you acted while the rule said to hold.' : 'Your decision did not follow the rule: you held past the week it said to act.'
  const reveals = j.acted
    ? (j.leftRange ? 'That suggests you act on your share, not on the price.'
      : j.priceMove === 'fall' ? 'That suggests you react to a falling price.' : 'That suggests you let a rising price move you.')
    : (j.firstOut ? 'That suggests you hold on through a drift, even after the plan says to act.' : 'That suggests you are comfortable holding when the plan says hold.')
  return { id, played: true, title: data.label, judged: j, lines: [`${market} ${watched}`, `${when} ${rule}`, `${followed} ${reveals}`] }
}

function holdReceipt(holds) {
  const played = HOLD_IDS.filter((id) => holds[id])
  const judged = played.map((id) => judgeHold(id, holds[id]))
  const habit = habitOf(judged)
  const confidence = !judged.length
    ? 'There is no habit to carry forward yet. The three holds are still there when you want to play them.'
    : habit === 'range' ? 'If you kept to this habit, your share abroad would stay inside the figure you pick, which is what the rule is for.'
    : habit === 'still' ? 'If you kept to this habit, your share abroad would drift with prices, and some years would take it outside 10 to 15 per cent before you noticed.'
    : habit === 'every' ? 'If you kept to this habit, you would keep moving money whether or not your share had left 10 to 15 per cent, and the figure you picked would stop meaning much.'
    : 'If you kept to this habit, where your share ended up would depend on which year you were in, not on the figure you picked.'
  return {
    kind: 'hold', habit, habitText: HABITS[habit], confidence,
    stories: HOLD_IDS.map((id) => yearStory(id, holds[id])),
    marks: HOLD_IDS.map((id) => ({ id, label: HOLD_DATA[id].label, result: holds[id] || null, weeks: HOLD_DATA[id].weeks.length })),
    questions: [
      'What made you let go when you did, and was it the price, or the share?',
      'When the money fell, what were you afraid of losing, and when it rose, what were you afraid of missing?',
      'How do you read a market that is moving, and would you read it the same way a year from now?',
    ],
  }
}

// the holds she played, checked: a hold is only counted if it is a release in a week the year had started moving, or an end
function validateHoldRequest(body) {
  const holds = body?.holds;
  if (!holds || typeof holds !== 'object' || Array.isArray(holds)) throw httpError(400, 'Provide the holds for article 3.');
  const clean = {};
  for (const id of HOLD_IDS) {
    const hold = holds[id];
    if (hold === undefined || hold === null) continue;
    const last = HOLD_DATA[id].weeks.length - 1;
    if (hold.action === 'end') clean[id] = { action: 'end', week: last };
    else if (hold.action === 'release' && Number.isInteger(hold.week) && hold.week >= 1 && hold.week <= last) clean[id] = { action: 'release', week: hold.week };
    else throw httpError(400, 'A hold must be a release in a week of the year, or the end.');
  }
  return clean;
}

const FORBIDDEN = /\b(right|wrong|correct|incorrect|mistake|failed)\b|!/i;

function generateHoldReceipt(body) {
  const receipt = holdReceipt(validateHoldRequest(body));
  const text = [receipt.habitText, receipt.confidence, ...receipt.stories.flatMap((s) => s.lines), ...receipt.questions].join(' ');
  if (FORBIDDEN.test(text)) throw httpError(502, 'The receipt could not be written. Please retry.');
  return receipt;
}

module.exports = { generateHoldReceipt, validateHoldRequest, holdReceipt, judgeHold, habitOf, yearStory, HOLD_IDS, RANGE };
