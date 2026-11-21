import { HOLD_DATA } from './holdData.js'

export const RANGE = { low: 10, high: 15 }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ₹1,04,300: rupees with Indian grouping (last three digits, then pairs)
export function rupees(value) {
  const digits = String(Math.round(value))
  const last3 = digits.slice(-3)
  const rest = digits.slice(0, -3)
  return `₹${rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},` : ''}${last3}`
}
export const share = (value) => value.toFixed(1)
export const lastWeek = (id) => HOLD_DATA[id].weeks.length - 1
export const weekMonth = (id, week) => {
  const [year, month] = HOLD_DATA[id].weeks[week]
  return `${MONTHS[month - 1]} ${year}`
}
export const weekFigures = (id, week) => {
  const [, , value, pct] = HOLD_DATA[id].weeks[week]
  return { value: rupees(value), share: share(pct) }
}

// the sentence while the year plays
export const playingParts = (id, week) => ({ month: weekMonth(id, week), ...weekFigures(id, week) })

// the sentence that follows a stop: where the year ended
export const closingSentence = (id) => {
  const { value, share: pct } = weekFigures(id, lastWeek(id))
  return `By December ${HOLD_DATA[id].year}, it was worth ${value}, ${pct} per cent of your portfolio.`
}

// how many of a hold's weeks fall in each month: used to step the underline a month at a time with reduced motion
export const monthEndWeek = (id, week) => {
  const weeks = HOLD_DATA[id].weeks
  let end = week
  while (end + 1 < weeks.length && weeks[end + 1][1] === weeks[week][1]) end += 1
  return end
}
