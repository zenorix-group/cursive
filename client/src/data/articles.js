import { plate1 } from './plates.js'

export const article1 = {
  number: 1,
  mechanic: 'The Next Question',
  // what the game card says: one idea per article, matching how its game actually works
  gameInfo: {
    title: 'Three moments in the story ask for your question.',
    body: [
      'Tap a bar between paragraphs and write the question you would want answered next, in your own words.',
      'Open a bar again to change or clear your question. Nothing here is graded; a bar left empty is part of your reading too.',
    ],
  },
  tagline: 'Ask the question everything else waits on',
  title: ['The Courts Said Yes.', 'Now Get Nirav Modi Home.'],
  headline: 'Now Get Nirav Modi Home.',
  author: 'Monica Behura',
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
  gameInfo: {
    title: 'Three sections of the article are missing.',
    body: [
      'Open The Call and pick up to five lines from the conversation. Then tap a dot at the end of a paragraph and place the line you think completes it.',
      'A dot stays an outline until a line is placed. You can change a placement whenever you like; lines you keep but never place are part of your receipt too.',
    ],
  },
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
  author: 'Sampurna Majumder',
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

// Article 3, "The Hold". `body` blocks: { h } is a subheading; a paragraph is { p }, or { lead, hold, holdText, after } where
// `lead` is the text before a hold marker, `holdText` the hold sentence (hidden until the reader presses the ±) and `after`
// the sentence the article says about it (shown once the hold has been played).
export const article3 = {
  number: 3,
  mechanic: 'The Hold',
  rule: 'Hold until the year runs out, unless your share abroad leaves 10 to 15 per cent; then let go.',
  gameInfo: {
    title: 'Three moments in the story ask you to hold.',
    body: [
      'Press and hold a ± to play a real year of prices, one week at a time. Let go in the week you would act on your money.',
      'If you never let go, the hold ends at the full stop and counts as holding to the end. Nothing here is graded.',
    ],
  },
  tagline: 'Hold until the year runs out, unless your share abroad leaves 10 to 15 per cent.',
  title: ['Should You Invest In', 'Foreign Or International', 'Equities?'],
  readingTitle: ['Should You Invest In', 'Foreign Or International', 'Equities?'],
  headline: 'Should You Invest In Foreign Or International Equities?',
  blurb: 'Where the answer lives: in the rule in the article’s second paragraph.',
  plate: plate1,
  litFlag: 'in',
  litPoints: article2.litPoints,
  crop: article2.crop,
  readPath: '/read/3',
  minutes: 6,
  author: 'Sampurna Majumder',
  body: [
    { p: 'The financial equivalent of putting all your nest eggs in one basket is keeping every rupee inside one country. In India, funds that buy foreign shares have long been small next to their domestic peers, but they have been climbing the ladder since they first arrived.' },
    { p: 'Advisers often suggest keeping 10 to 15 per cent of your portfolio abroad. Once you have picked your figure, you act only when the part abroad leaves that range: above 15 per cent, you move the extra home, and below 10, you top it up. Inside the range, you leave it alone.' },
    { h: 'What are foreign or international equities?' },
    { p: 'As the name suggests, these are shares in companies listed on stock markets outside India, and there are two ways to reach them.' },
    { p: 'Going direct means buying those shares yourself, through a broker who can deal abroad. Going indirect means putting your money into an Indian mutual fund and letting the fund do the buying for you.' },
    { p: 'The indirect route works like any Indian fund you already know. You hand over rupees, you are given units in the scheme, and a daily price tells you what they are worth. Indian fund houses run all of it, under Indian rules.' },
    { h: 'Why buy them?' },
    { p: 'Google, Apple and their peers are headquartered abroad, and millions of their customers are here. Owning a slice of them puts part of your savings on growth that does not depend on the Indian economy alone.' },
    {
      lead: 'Nothing about a company being foreign makes it safer.', hold: 'h1',
      holdText: 'In February 2020, weeks before the pandemic shut much of the world, you hold ₹1 lakh in American shares, 12 per cent of your portfolio.',
      after: 'A global name can fall as hard as a local one.',
    },
    {
      lead: 'In most years, though, world markets do not rise and fall together.', hold: 'h2',
      holdText: 'In January 2011, as Indian shares begin a year-long slide, you hold ₹1 lakh in American shares, 12 per cent of your portfolio.',
      after: 'A bad year for one country’s shares need not be a bad year for the rest.',
    },
    { h: 'What are the limits?' },
    { p: 'Both routes are capped, but the two caps work differently.' },
    { p: 'The government limits how much money one person may send out of India in a year, currently 250,000 dollars. That limit applies to the direct route.' },
    { p: 'Indian mutual funds are allowed to hold only about seven billion dollars in foreign shares between them all. That ceiling is filled by everyone, and when it is close to full, fund houses stop taking new money.' },
    { h: 'How do you start?' },
    { p: 'Open an account with a brokerage that has a tie-up abroad, or go to a fund house if you are taking the indirect route. Identity proof and a verification check are enough to begin.' },
    { h: 'Keeping to your figure' },
    {
      lead: 'There is no standard figure, because it depends on your appetite for risk.', hold: 'h3',
      holdText: 'In January 2022, after two boom years for technology, you hold ₹1 lakh in American technology shares, 12 per cent of your portfolio.',
      after: 'Keeping to the figure you pick is the harder part, and you only learn how hard when prices move.',
    },
    { h: 'The big markets' },
    { p: 'In the United States, the big indices are the S&P 500, the Dow Jones and the Nasdaq. Britain has the FTSE 100, Hong Kong the Hang Seng, Japan the Nikkei 225 and Australia the S&P/ASX 200.' },
  ],
}

// Article 4, "Write for the Earth" (Hindsight Highlights). `body` blocks: { byline } the dateline, { h } a subheading, { s: [...] } a
// paragraph whose sentences are the markable ones, { q: [...] } the president's quote (set apart). Ids are for the log and the server
// only and are never rendered. The byline and the two subheadings are not markable.
export const article4 = {
  number: 4,
  mechanic: 'Hindsight Highlights',
  rule: 'Mark the sentences that are a combination of the two themes in the article and then write to us with what is running through your head.',
  gameInfo: {
    title: 'Mark the sentences that carry both themes.',
    body: [
      'A sentence qualifies when it is about writing and the earth in the same breath. One theme alone does not, however good the sentence is.',
      'Tap a sentence to mark it and tap again to unmark it. File when you are done, keep two of the words offered from what you marked, and write whatever you like with them. Nothing is judged at the tap.',
    ],
  },
  tagline: 'Mark where writing and the earth share a sentence.',
  title: ['Write for', 'the Earth'],
  readingTitle: ['Write for', 'the Earth'],
  subtitle: 'Literature: the Grand Prix Francophone de Poésie et du Conte officially opens — the Francophone world invited to “Write for the Earth”',
  headline: 'Write for the Earth',
  blurb: 'Where the answer lives: in the sentences where writing and the earth arrive together, and in the line you write from them.',
  plate: plate1,
  litFlag: 'in',
  litPoints: article2.litPoints,
  crop: article2.crop,
  readPath: '/read/4',
  minutes: 3,
  author: 'Bonnie Wiseman',
  budget: 5, // a guess, set above the number that qualifies so that the count is not itself a hint
  body: [
    { byline: 'Bonnie Wiseman · Paris, 9 September 2026' },
    { s: [
      { id: 'S1', text: 'Lovers of words, of poetry and of short stories now have a date they cannot miss.' },
      { id: 'S2', text: 'The Grand Prix Francophone de Poésie et du Conte is officially opening entries for its first edition, and invites every author writing in French, amateur and established alike, to make their voice heard on one of the great questions of our time: the protection of our planet.' },
    ] },
    { s: [
      { id: 'S3', text: 'Organised by the educational, cultural and literary platform Grand Prix Francophone, which is run by the France-based NGO Réseau pour l’Éducation, l’Art et le Développement (READ), this international literary competition sets out to promote Francophone writing while awakening citizens to the great environmental challenges.' },
    ] },
    { h: 'A theme that carries hope' },
    { s: [
      { id: 'S4', text: 'For this inaugural edition, entrants must submit an original work inspired by the environmental theme.' },
      { id: 'S5', text: 'Through their writing, candidates may explore any number of key subjects: the preservation of nature, waste management, recycling, the protection of water resources, the fight against the pollution of oceans and waterways, and the impact of climate change.' },
    ] },
    { s: [
      { id: 'S6', text: 'For Bonnie Wiseman, president of READ and of the Grand Prix Francophone organising committee, this competition — open to the whole of the Francophone world — is intended as a channel for expression and a celebration of creativity:' },
    ] },
    { q: [
      { id: 'S7', text: '“A great many texts are still asleep in notebooks and in drawers.' },
      { id: 'S8', text: 'This competition is an invitation to bring them to life.' },
      { id: 'S9', text: 'Every pen can help awaken consciences and build a more sustainable future,” he says.' },
    ] },
    { h: 'An international reach.' },
    { s: [
      { id: 'S10', text: 'Dedicated to the discovery of new talent, the competition offers an exceptional showcase to emerging pens and seasoned writers alike.' },
      { id: 'S11', text: 'The works will be judged by an international jury made up of academics and figures from the European and African literary scene.' },
    ] },
    { s: [
      { id: 'S12', text: 'This 2026 edition will culminate in some twenty prizewinners being honoured internationally, at two award ceremonies: the first in Abidjan, the second in Paris.' },
    ] },
    { s: [
      { id: 'S13', text: 'The organising committee invites everyone with a passion for writing to begin today — to turn their reflections into poems or short stories, and to take part in this great celebration of Francophone creation.' },
    ] },
  ],
  // the drawer the six words are drawn from: nouns and verbs only, in the order they are preferred. The stop list (competition,
  // edition, committee and the like carry nothing) is the words left out of these lists.
  drawer: {
    S1: ['words', 'poetry', 'stories', 'lovers'],
    S2: ['planet', 'voice', 'author', 'protection'],
    S3: ['writing', 'citizens', 'challenges'],
    S4: ['work', 'theme'],
    S5: ['oceans', 'nature', 'waste', 'recycling', 'climate', 'pollution', 'water'],
    S6: ['expression', 'creativity'],
    S7: ['texts', 'drawers', 'notebooks'],
    S8: ['life', 'invitation'],
    S9: ['pen', 'future', 'consciences'],
    S10: ['talent', 'pens', 'writers', 'showcase'],
    S11: ['jury', 'academics', 'figures'],
    S12: ['prizewinners', 'Paris', 'Abidjan', 'ceremonies'],
    S13: ['reflections', 'poems', 'stories', 'creation'],
  },
}
export const SENTENCE_IDS = article4.body.flatMap((b) => (b.s || b.q || []).map((s) => s.id))

// Article 5, "Behind Don Quixote": six moments, one paragraph each. The paragraphs never move; each one's title hides behind a
// marker. m2 to m4 start with titles that are out of place (the ¶ ones); the reader swaps them. The page never says which is right.
export const article5 = {
  number: 5,
  mechanic: 'Re-Arrange',
  rule: 'Tap a marker to see its title. The three titles marked ¶ are in the wrong place. Drag each one to the moment it belongs to, then file.',
  gameInfo: {
    title: 'Three titles are in the wrong place.',
    body: [
      'Tap a marker to show its title. The three marked ¶ are the ones out of place.',
      'Press and hold a ¶ title, then drop it on another ¶ moment to swap the two. Move them as often as you like, then file. Nothing here is graded.',
    ],
  },
  tagline: 'Tap a marker to see its title. Three titles are out of place.',
  title: ['Behind', 'Don Quixote'],
  readingTitle: ['Behind', 'Don Quixote'],
  subtitle: 'The Life That Shaped the Novel',
  headline: 'Behind Don Quixote',
  standfirst: 'Before he created one of literature’s most famous adventurers, Miguel de Cervantes had already lived an extraordinary adventure of his own.',
  instruction: 'The three titles marked ¶ are in the wrong place. Move each one to the moment it belongs to.',
  blurb: 'Where the answer lives: in each paragraph: what the moment is about.',
  plate: plate1,
  litFlag: 'in',
  litPoints: article2.litPoints,
  crop: article2.crop,
  readPath: '/read/5',
  minutes: 8,
  author: 'Maria Gessy De Sales',
  // movable: the ¶ moments, whose titles swap. Titles listed here are where they start.
  moments: [
    { id: 'm1', title: 'Before the Battle', movable: false, text: 'Cervantes was born in 1547 into a family that moved frequently through Spain. As a young man, he eventually travelled to Italy, where he encountered the culture of the Renaissance. But books, paintings and Roman streets would soon give way to something very different. Europe was preparing for war in the Mediterranean. Cervantes enlisted. The man of letters was about to become a man of arms.' },
    { id: 'm2', title: 'Freedom', movable: true, text: 'Before Cervantes became a novelist, he became a soldier. At the Battle of Lepanto in 1571, Christian and Ottoman fleets collided in one of the great naval battles of the sixteenth century. Although ill, Cervantes insisted on fighting. He received several wounds, one of which permanently impaired his left hand. He would later remember Lepanto not with bitterness, but with pride.' },
    { id: 'm3', title: 'The Soldier', movable: true, text: 'Freedom disappeared suddenly. While sailing back to Spain, Cervantes’s ship was captured by corsairs. He was taken to Algiers and spent five years in captivity. He did not simply wait for rescue. Again and again, he tried to escape. Several plans failed, yet contemporary testimony describes Cervantes accepting responsibility rather than betraying companions who had taken part with him. Captivity taught him the cost of freedom — and perhaps also the stubbornness required to keep imagining it.' },
    { id: 'm4', title: 'The Captive', movable: true, text: 'Eventually, Cervantes did not escape. He was ransomed. In 1580, after five years in Algiers, he finally returned to Spain. The young man who had left his homeland seeking opportunity returned wounded, impoverished and carrying memories of war, captivity, fear, courage and frustrated hopes. His great adventures were over. Or so it might have seemed.' },
    { id: 'm5', title: 'The Writer', movable: false, text: 'Years later, an ageing Cervantes began transforming experience into something stranger and more enduring than autobiography. In 1605, the first part of Don Quixote appeared. Its hero sees giants where others see windmills and pursues an ideal world that stubborn reality refuses to provide. It is tempting to ask how much Cervantes himself understood that distance between the world as it is and the world as we wish it to be.' },
    { id: 'm6', title: 'The Question', movable: false, text: 'This tension between documented history and imagined inner life lies at the heart of I, Miguel de Cervantes, a fictional autobiography by Maria Gessy de Sales, published in Portuguese as Eu, Miguel de Cervantes: Memórias. The historical events are real: Italy, Lepanto, captivity in Algiers, repeated escape attempts and the return to Spain. History often tells us what happened, but we are curious to know what it felt like. A fictional autobiography asks a different kind of question: What happens inside a man while history is happening to him?' },
  ],
}

// Article 6, "Four Cups". `body` blocks: { q } a quotation, { p } a paragraph, { segs } a paragraph whose text is cut by seats
// ({ seat: 's1' } sits right after the sentence before it), { row } a row of four cups (the scene break with the game on).
export const article6 = {
  number: 6,
  mechanic: 'Four Cups',
  rule: 'You have four cups of tea. Tap them to see the seats, set your cups where you think the old man’s promise comes true, then file. Tap a cup you have set to take it back.',
  gameInfo: {
    title: 'Four cups, seven seats.',
    body: [
      'Tap the four cups to show the seats, one after each person Murari spends his days on and the last beside the Peepal tree.',
      'Tap a seat to set a cup there, as many on one seat as you like. Tap a cup you have set to take it back. Nothing here is graded.',
    ],
  },
  tagline: 'Set your four cups where the old man’s promise comes true.',
  title: ['The Retired', 'Gentleman'],
  readingTitle: ['The Retired', 'Gentleman'],
  headline: 'The Retired Gentleman',
  blurb: 'Where the answer lives: in the old man’s promise: what it tells Murari to listen for.',
  plate: plate1,
  litFlag: 'in',
  litPoints: article2.litPoints,
  crop: article2.crop,
  readPath: '/read/6',
  minutes: 7,
  author: 'Saumya Dikshit',
  seats: [
    { id: 's1', name: 'Mohan' },
    { id: 's2', name: 'Buntu' },
    { id: 's3', name: 'the old man' },
    { id: 's4', name: 'the travellers' },
    { id: 's5', name: 'the people with problems' },
    { id: 's6', name: 'the disillusioned man' },
    { id: 's7', name: 'the Peepal tree' },
  ],
  body: [
    { q: '“The work of magic is this, that it breathes and at every breath transforms realities”' },
    { p: 'Mr. Murari Lal retired from his state bus driving duty some 15 years ago. He put his 2 kids through college, saw them off to good jobs in bigger cities and just as he had settled into his retired life, his wife passed away.' },
    { p: 'For the past 10 years he had a very specific routine.' },
    { p: 'He would get ready and leave his place at sharp 8 am and go and spend 1 hour each in the 8 tea shops which were scattered in the 5 kilometre radius of his home.' },
    { row: true },
    { segs: ['He would greet the server, Mohan at Lalla’s Tea shop with his usual ‘Ram Ram’.', { seat: 's1' }] },
    { segs: ['He would lovingly slap little Buntu on the back upon arrival at Buntu’s Nukkad Tea shop.', { seat: 's2' }, ' He would diligently strike conversations with at least 5 absolute strangers every single day.'] },
    { p: 'Some colour on a stranger would catch his eye.' },
    { p: 'Or a word would make his ears perk up.' },
    { p: 'Sometimes he chose the person because the shape of their nose or a glint in their eyes captured his imagination and sometimes he would get a whiff of something when they walked by which would make him abandon his newspaper and find ways to engage in a conversation with this new entity that had just arrived.' },
    { p: 'This wasn’t just to kill time though.' },
    { p: 'You see, our Mr. Murari Lal had a secret.' },
    { p: 'When he was 10 years old he randomly met a very old man on the street who absolutely randomly started yelling at him the following words -' },
    { q: '“One absolutely ordinary day in your life, you will hear something that will make you see the reality behind this entire world - that day you will hear the special music consistently playing in the background of the surrounding noise and you will see the rich and deep colours underlying the ordinary colours”' },
    { row: true },
    { segs: ['and then the old man proceeded to do a crazy dance as if intoxicated by sights and sounds that were invisible to the little boy.', { seat: 's3' }] },
    { p: 'After this insane display, the very old man ran away from the 10 year old Murari as if he himself was 10 and not the 88 that he really looked like.' },
    { p: 'This seemingly strange incident would be instantly rejected by a logical adult but for the 10 year old boy, it was the most interesting thing that had ever happened to him in his life so far.' },
    { p: 'For the first couple of weeks he tried sharing this strange incident with his family and friends but nobody seemed very impressed and little Murari decided that his narration must be faulty and slowly he stopped recounting this strange incident, first for the world and then slowly even for his own self.' },
    { p: 'For many years he completely forgot about this old tale but as he grew older these strange childhood memories would wash over him unexpectedly.' },
    { p: 'As his life became less busy and more lonely, every morning the first thing on his mind used to be -' },
    { q: '“Could this be THAT ordinary day?”' },
    { p: 'He would smile at his childishness and yet he would go about his days with a tiny, hidden lamp in his heart, hoping to today bump into that stranger who would say the magic words which he’d been secretly yearning to hear since he was 10.' },
    { row: true },
    { segs: ['Over the years he heard fantastic tales of travellers from around the world.', { seat: 's4' }] },
    { p: 'He heard the many words of the boastful and the very few words of the shy.' },
    { segs: ['He heard long and painstaking descriptions of all the insane kind of problems a person can have.', { seat: 's5' }] },
    { p: 'He was pushed into taking stands, pulled into fantasies, cajoled into naivete, pleaded to, sometimes confused, sometimes thrilled by all the many conversations he had with strangers yet at the end of the day he knew he had not met The One.' },
    { segs: ['On 25th April 1978, Mr. Murari Lal was walking wistfully back home in the evening after finishing all his tea shop rounds and hearing a particularly long drawn out story of a disillusioned man.', { seat: 's6' }, ' He suddenly heard the familiar rustling of the old Peepal tree across the corner like he’d never heard before.', { seat: 's7' }] },
    { p: 'His head turned incredulously towards the dancing leaves of the ancient Peepal tree, his eyes becoming wider with absolute astonishment at this most familiar sight of dancing Peepal leaves.' },
    { p: 'And just like there are never two sunsets alike, never two waves identical - Mr. Murari Lal was never again the same as he was just a second ago…' },
  ],
}

// Article 7, "Room 912". `body` blocks: { p } a paragraph, { status } a line in the report's own voice (set apart), { itinerary } the
// printed schedule, { break: 'b1' | 'b2' } a break where the game's two notes appear (with the game on), { mark } a point the
// page measures to know how far she has read ('morning', 'end'). With the game off the page is the report alone.
export const article7 = {
  number: 7,
  mechanic: 'Two Files',
  rule: 'Two files are open on Room 912: the hotel’s record, for what the hotel can confirm, and the Bureau of Unfiled Incidents, for what it cannot. At each of the two breaks in the report, update both notes in up to twelve words each, then file.',
  gameInfo: {
    title: 'Two files, two breaks.',
    body: [
      'The report pauses twice. At each break, write one note for the hotel’s record and one for the Bureau of Unfiled Incidents, in up to twelve words each.',
      'The second break shows your notes as you left them, so you can update them as the report gets stranger. Nothing here is graded.',
    ],
  },
  tagline: 'Two files on one night: what the hotel can confirm, and what it cannot.',
  title: ['Room 912'],
  readingTitle: ['Room 912'],
  subtitle: 'Matchday Accommodation Unit. Internal Distribution Only.',
  headline: 'Room 912',
  blurb: 'Where the answer lives: in who or what stands behind each part of the report: the hotel’s own systems and checks, or one person’s word and what no check explains.',
  plate: plate1,
  litFlag: 'in',
  litPoints: article2.litPoints,
  crop: article2.crop,
  readPath: '/read/7',
  minutes: 3,
  author: 'Azli Nor',
  breaks: {
    b1: 'Statement received: Attendant Sofia. Update the files.',
    b2: 'Checks received: Reception, Security, Engineering. Update the files.',
  },
  body: [
    { p: 'At 23:18, housekeeping received a request for fresh towels from Room 912. The room is blocked from guest allocation on football weekends due to an unresolved plumbing issue. No keycards have been issued for Room 912 since the beginning of the season. Housekeeping contacted Reception to verify occupancy.' },
    { status: 'Reception confirmed: Room Status: Vacant' },
    { p: 'The request remained active. At 23:26, Attendant Sofia proceeded to the ninth floor carrying replacement towels. She later stated that the corridor felt unusually busy despite no guests being present. She distinctly remembers stepping aside twice to allow people to pass. CCTV footage shows the corridor empty. Room 912 was found closed. A light was visible beneath the door. Sofia knocked. A voice replied immediately “just leave them outside, thank you.” The voice was calm. Male. Estimated age: 30–40. No accent identified. Believing the room had been assigned in error, Sofia placed the towels outside the door and departed.' },
    { break: 'b1' },
    { p: 'At 23:41, reception reviewed the electronic lock history. No entry into Room 912 had been recorded for 137 days. At 23:52, Security checked the ninth floor. The towels were no longer outside the room. At 00:07, Engineering unlocked Room 912 for inspection. The room was dark. Bathroom dry. Bed made, television off, no luggage, no occupants. The fresh towels were folded neatly on the bathroom rack.' },
    { p: 'One additional item was found on the bedside table. A printed itinerary, laid out exactly like the visiting club’s schedule.' },
    { itinerary: ['Tomorrow', '08:00 – Breakfast', '09:30 – Team Bus', '11:00 – Stadium Arrival', '13:00 – Kick-off'] },
    { p: 'The match was not scheduled to begin until 20:00.' },
    { break: 'b2' },
    { mark: 'morning', p: 'At 08:00 the following morning, the league announced that kick-off had been brought forward.' },
    { status: 'New kick-off time:' },
    { status: '13:00' },
    { p: 'The change was attributed to “operational considerations”. No further explanation was issued. The visiting club’s revised schedule matched the itinerary exactly. Room 912 remains unavailable for booking. The towel request has not been closed.' },
    { status: 'Room Status: Vacant' },
    { status: 'Housekeeping Status: Serviced' },
    { status: 'Occupancy Status: Pending' },
    { mark: 'end', p: 'No further inquiry has been requested.' },
    { credit: 'Filed by the Bureau of Unfiled Incidents.' },
  ],
}
