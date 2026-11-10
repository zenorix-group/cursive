import { plate1 } from './plates.js'

export const article1 = {
  number: 1,
  mechanic: 'The Next Question',
  tagline: 'Ask the question everything else waits on',
  title: ['The Courts Said Yes.', 'Now Get Nirav Modi Home.'],
  headline: 'Now Get Nirav Modi Home.',
  author: 'Author name',
  minutes: 8,
  blurb: "Where the answer lives: in what the piece argued, except at Q3, where it doesn't exist yet",
  plate: plate1,
  litFlag: 'uk', // the flag the reader found, kept lit on this page
  body: [
    'In March 2019, Nirav Modi was tracked down to a rented apartment in Centre Point, London, after sixteen months of evasion following the collapse of Punjab National Bank’s credit operations in Mumbai. His arrest on a Holborn pavement inaugurated one of the most litigated extradition cases in modern British legal history—a labyrinth of bail applications, sovereign assurances, and medical assessments that tested the resilience of bilateral treaties.',
    'By February 2021, District Judge Sam Goozee at Westminster Magistrates’ Court had formally sent the case to the Home Secretary for extradition approval, dismissing arguments regarding mental health deterioration and Indian prison conditions at Arthur Road’s Barrack 12. Yet across five subsequent appeals, culminations of review petitions, and an extraordinary March 2026 attempt to reopen proceedings under revised psychiatric testimony, the physical distance between Wandsworth Prison and an Indian courtroom remained unbridged.',
    'The British High Court’s eventual refusal to certify questions of general public importance for a Supreme Court challenge appeared to seal the legal trajectory. When Modi’s legal team petitioned the European Court of Human Rights under Rule 39 seeking interim injunctions, the Strasbourg bench initially granted temporary anonymity to the appellant while declining to grant injunctive stay.',
    'The British High Court’s eventual refusal to certify questions of general public importance for a Supreme Court challenge appeared to seal the legal trajectory. When Modi’s legal team petitioned the European Court of Human Rights under Rule 39 seeking interim injunctions, the Strasbourg bench initially granted temporary anonymity to the appellant while declining to grant injunctive stay.',
    'A spokesman for the Ministry of External Affairs in New Delhi declared that the government would continue its relentless pursuit until fugitives faced Indian justice. Yet between the final gavel and an escort boarding an Air India flight from Heathrow lies a dense thicket of administrative protocol. A formal surrender warrant must be countersigned; logistical escorts from the Central Bureau of Investigation must secure diplomatic overflight clearances; and British prison authorities must execute physical custody transfer at an airfield boundary.',
    'Historically, this bureaucratic transition is where extraditions drift into indeterminate stasis. Files move between consular desks, flight health certificates expire, and parallel administrative appeals regarding travel documents create friction far outside courtroom scrutiny.',
    'The Modi proceeding demonstrates that high-profile extraditions possess two finish lines: the judicial line, marked by judgments and written orders, and the logistical line, marked by wheels up. The former belongs to barristers, the latter to bureaucrats.',
    'Until the aircraft enters sovereign airspace, the legal declaration remains an unfinished sentence. The courts have answered every objection India was asked to meet; what remains is whether administrative will can move faster than the quiet erosion of institutional attention.',
  ],
}

export const article2 = {
  number: 2,
  mechanic: 'The Call You Trust',
  tagline: 'Highlights how easily a fraudulent call can appear genuine.',
  title: ['Common Banking Frauds', 'Everyone Should Know'],
  blurb: 'Where the answer lives: in what the piece argued,',
  plate: plate1,
  litFlag: 'in',
  // lit area for this page: follows the hood edge down to the laptop and keeps India Gate inside, as in the design
  litPoints: '334,6 290,22 264,38 241,54 231,64 221,90 211,107 234,136 250,171 254,199 246,222 231,253 249,281 262,304 269,329 276,346 290,350 320,351 334,353',
  // plate region shown in the card (plate px ~18..331 x 8..452), as a % of the card width
  crop: { width: '111.5%', left: '-5.75%', top: '-2.4%' },
  readPath: '/read/2',
  headline: 'Common Banking Frauds Everyone Should Know',
  readingTitle: ['Common Banking', 'Frauds Everyone', 'Should Know'],
  minutes: 8,
  author: 'Author name',
  sectionLabel: 'The Call',
  inlineBlankAfter: [1, 2, 3],
  body: [
    "Here's what nobody tells you: bank fraud victims are not careless people. They are retired professionals, young engineers, financially literate adults, and people exactly like you. The only difference between them and everyone else is that they encountered a fraudster at exactly the right moment of distraction, trust, or urgency. What happens to them isn't a trick. It's a procedure, and it has three parts.",
    "Fraudsters today do not guess. They buy. Personal details leak in bulk from data breaches and get resold cheaply, so by the time your phone rings, the person on the line already has most of what a real bank employee would have in front of them. That's why the call opens by telling you things about yourself",
    "Then there's the part you can't check. Don't rely on who a call says it is from. Scammers can make an incoming call show any name they like, including one you would recognise, and the software that does it costs them almost nothing. The thing you trust most is the easiest thing for them to fake",
    "And they build the clock themselves. Nothing about a disputed transaction expires while you're on the phone. Fraudsters create a false sense of urgency so that you can't think clearly, and so that you don't do the one thing that would end the call, which is to hang up and ring the bank yourself on the number printed on your",
    "So the tell is never how much they know, or how right the call looks, or how little time you think you have. All three of those can be bought, faked, or made up. Never share confidential banking information. If anyone asks for your OTP, PIN, CVV, or internet banking password, treat it as a red flag. Your bank sends you an OTP so that you can prove you're you. It never needs it back.",
    "If you've already shared one, act fast and don't waste time on embarrassment. Call 1930, the National Cyber Crime Helpline, and tell your bank to block the card and freeze the account. Save the messages, the numbers, and the call details. Prompt reporting can help authorities trace and freeze the money before it moves again.",
  ],
}
