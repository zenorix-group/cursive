import { useLocation, useNavigate } from 'react-router-dom'
import AssistiveTouch from './AssistiveTouch.jsx'
import { useMenu } from './menuContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import * as I from './menuIcons.jsx'
import { useReadProgress } from '../lib/readProgress.js'
import { receiptStatus } from '../lib/overture.js'

const pad = (n) => String(n).padStart(2, '0')

const STATE_LABEL = { stored: 'Stored', ready: 'Ready', empty: 'Not yet' }
const STATE_NOTE = { stored: 'Stored', ready: 'Ready to read', empty: 'Nothing saved yet' }
const ARTICLE_NAME = { 1: 'The Questions You Left Open', 2: 'The Lines You Carried' }

// the overture keeps the reader's receipts; this tile opens the list from any page
export function makeReceiptsItem(navigate) {
  const count = () => [1, 2].filter((n) => receiptStatus(n) !== 'empty').length
  return {
    key: 'receipts',
    label: 'Receipts',
    wide: true,
    icon: <I.Receipt />,
    note: () => `${count()} of 2`,
    sub: () => [1, 2].map((n) => {
      const state = receiptStatus(n)
      return { key: `receipt-${n}`, label: ARTICLE_NAME[n], sublabel: `Article ${pad(n)} · ${STATE_NOTE[state]}`, badge: STATE_LABEL[state], state, onClick: () => navigate(n === 2 ? '/receipt/2' : '/receipt') }
    }),
  }
}

// which article a route belongs to (1 unless it is clearly article 2)
const articleOf = (pathname) => (/^\/(article|read|receipt)\/2(\/|$)/.test(pathname) ? 2 : 1)

// The floating menu follows the page the reader is on: it offers the next sensible moves from here.
// Pages with their own actions (the reading room's tabs) take over through useMenuOverride.
function RouteMenu() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { override } = useMenu()
  // inside an article the button doubles as a reading-progress ring
  const progress = useReadProgress(pathname === '/read' || pathname === '/read/2')

  const go = (path) => () => navigate(path)
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const item = (key, label, icon, onClick) => ({ key, label, icon, onClick })
  const room = item('room', 'Reading room', <I.Book />, go('/reading-room'))
  const account = user
    ? item('account', 'Sign out', <I.User />, async () => { await logout(); navigate('/login') })
    : item('account', 'Sign in', <I.User />, go('/login'))

  let page = null
  const n = articleOf(pathname)

  // the overture belongs to the app proper: guests are still in onboarding, whichever article they picked
  if (!user) page = null
  else if (override) page = override
  else if (pathname === '/reading-room' || pathname === '/' || pathname === '/enter' || pathname === '/login') page = null
  else if (/^\/article\/\d+$/.test(pathname)) {
    page = {
      title: `Article ${pad(n)}`,
      items: [item('start', 'Start reading', <I.Play />, go(n === 2 ? '/read/2' : '/read')), room, item('home', 'Home', <I.Home />, go('/')), account],
    }
  } else if (pathname === '/read' && !user) {
    // article 1 is read before signing up: signed-out readers get a menu with only Sign in
    page = { title: 'Reading · 01', items: [account], bare: true }
  } else if (pathname === '/read' || pathname === '/read/2') {
    page = {
      title: `Reading · ${pad(n)}`,
      items: [
        room,
        item('intro', 'Article intro', <I.Back />, go(n === 2 ? '/article/2' : '/article/1')),
        n === 2 ? item('call', 'The Call', <I.Phone />, go('/read/2/call')) : item('top', 'Back to top', <I.Up />, top),
        item('finish', 'Finish', <I.Receipt />, go(n === 2 ? '/receipt/2' : '/receipt')),
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
        item('article', 'Back to article', <I.Back />, go(n === 2 ? '/read/2' : '/read')),
        item('top', 'Back to top', <I.Up />, top),
        item('next', 'Next article', <I.Next />, go(user ? '/reading-room' : '/login#create')),
      ],
    }
  }

  if (!page) return null
  const withReceipts = page.bare || page.items.some((entry) => entry.key === 'receipts') ? page.items : [...page.items, makeReceiptsItem(navigate)]
  return <AssistiveTouch items={withReceipts} title={page.title} tone="light" progress={progress} />
}

export default RouteMenu
