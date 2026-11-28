import { useLocation, useNavigate } from 'react-router-dom'
import AssistiveTouch from './AssistiveTouch.jsx'
import { useMenu } from './menuContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import * as I from './menuIcons.jsx'
import { useReadProgress } from '../lib/readProgress.js'
import { receiptStatus } from '../lib/overture.js'
import { article3, article4, article5, article6, article7 } from '../data/articles.js'
import { useWaitingSign } from '../lib/signs.js'
import { useBleed } from '../lib/bleed.js'
import { setCompanion } from '../lib/companion.js'

const pad = (n) => String(n).padStart(2, '0')

const STATE_LABEL = { stored: 'Stored', ready: 'Ready', empty: 'Not yet' }
// the row says only what the badge does not: the number leads, the badge carries the state, and "ready" adds a short note
const STATE_NOTE = { stored: '', ready: 'Ready to read', empty: '' }
const NUMBERS = [1, 2, 3, 4, 5, 6, 7]
const ARTICLE_NAME = { 1: 'The Questions You Left Open', 2: 'The Lines You Carried', ...Object.fromEntries([article3, article4, article5, article6, article7].map((a) => [a.number, a.title.join(' ')])) }

// the overture keeps the reader's receipts; this tile opens the list from any page
export function makeReceiptsItem(navigate) {
  const count = () => NUMBERS.filter((n) => receiptStatus(n) !== 'empty').length
  return {
    key: 'receipts',
    label: 'Receipts',
    wide: true,
    icon: <I.Receipt />,
    note: () => `${count()} of ${NUMBERS.length}`,
    sub: () => NUMBERS.map((n) => {
      const state = receiptStatus(n)
      return { key: `receipt-${n}`, label: ARTICLE_NAME[n], num: pad(n), sublabel: STATE_NOTE[state], badge: STATE_LABEL[state], state, onClick: () => navigate(n === 1 ? '/receipt' : `/receipt/${n}`) }
    }),
  }
}

// which article a route belongs to (1 unless it is clearly article 2)
const articleOf = (pathname) => Number(/^\/(?:article|read|receipt)\/([2-7])(?:\/|$)/.exec(pathname)?.[1]) || 1
const readPath = (n) => (n === 1 ? '/read' : `/read/${n}`)
const introPath = (n) => `/article/${n}`
const receiptPath = (n) => (n === 1 ? '/receipt' : `/receipt/${n}`)

// The floating menu follows the page the reader is on: it offers the next sensible moves from here.
// Pages with their own actions (the reading room's tabs) take over through useMenuOverride.
function RouteMenu() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { override } = useMenu()
  // inside an article the button doubles as a reading-progress ring
  const inArticle = /^\/read(\/[2-7])?$/.test(pathname)
  const progress = useReadProgress(inArticle)

  useWaitingSign(!!user)
  useBleed(pathname === '/reading-room' || pathname === '/', Boolean(user)) // the same list for everyone, until she signs in and agrees to the picks
  const go = (path) => () => navigate(path)
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const item = (key, label, icon, onClick) => ({ key, label, icon, onClick })
  const room = item('room', 'Reading room', <I.Book />, go('/reading-room'))
  const account = user
    ? item('account', 'Sign out', <I.User />, async () => { await logout(); navigate('/login') })
    : item('account', 'Sign in', <I.User />, go('/login'))

  let page = null
  const n = articleOf(pathname)

  // the overture belongs to the app proper: guests are still in onboarding, whichever article they picked. But the Blot is how a
  // reader files, so a guest in an article still gets it, with a menu of only Sign in.
  // The home page (the reading room) gets the companion for everyone, so a guest sees the Overture, the Bleed and the rest too.
  // the landing page: the Blot and the Bleed for everyone, with the News tile and a way in
  if (pathname === '/' && !override) page = { title: 'Cursive', items: user ? [room, account] : [account], newsOnly: true }
  else if (!user) page = inArticle ? { title: `Reading · ${pad(n)}`, items: [account], bare: true } : pathname === '/reading-room' && override ? override : null
  else if (override) page = override
  else if (pathname === '/reading-room' || pathname === '/enter' || pathname === '/login') page = null
  else if (/^\/article\/\d+$/.test(pathname)) {
    page = {
      title: `Article ${pad(n)}`,
      items: [item('start', 'Start reading', <I.Play />, go(readPath(n))), room, item('home', 'Home', <I.Home />, go('/')), account],
    }
  } else if (/^\/read(\/[2-7])?$/.test(pathname)) {
    page = {
      title: `Reading · ${pad(n)}`,
      items: [
        room,
        item('intro', 'Article intro', <I.Back />, go(introPath(n))),
        n === 2 ? item('call', 'The Call', <I.Phone />, go('/read/2/call')) : item('top', 'Back to top', <I.Up />, top),
        item('finish', 'Finish', <I.Receipt />, go(receiptPath(n))),
      ],
    }
  } else if (pathname === '/read/2/call') {
    page = {
      title: 'The Call',
      items: [item('article', 'Back to article', <I.Back />, go('/read/2')), room, item('top', 'Back to top', <I.Up />, top), item('finish', 'Finish', <I.Receipt />, go('/receipt/2'))],
    }
  } else if (/^\/receipt/.test(pathname)) {
    page = {
      title: 'Your receipt',
      items: [
        room,
        item('article', 'Back to article', <I.Back />, go(readPath(n))),
        item('top', 'Back to top', <I.Up />, top),
        item('next', 'Next article', <I.Next />, go(user ? '/reading-room' : '/login#create')),
      ],
    }
  }

  if (!page) return null
  // the Overture's News tile opens the shelf: the companion grows into the list of everything still open
  const news = { key: 'news', label: 'News', icon: <I.News />, onClick: () => setCompanion({ shelf: true }) }
  const receipts = page.items.find((entry) => entry.key === 'receipts') || makeReceiptsItem(navigate)
  const withReceipts = page.bare ? page.items : page.newsOnly ? [...page.items, news] : [...page.items.filter((entry) => entry.key !== 'receipts'), news, receipts]
  return <AssistiveTouch items={withReceipts} title={page.title} tone="light" progress={progress} fixed={inArticle} />
}

export default RouteMenu
