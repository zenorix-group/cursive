export const liftTargets = [
  { id: 1, letter: 'A', lineId: 4, title: 'What they already know', reason: 'The paragraph argues that personal information was gathered before the call. The branch and card digits demonstrate what the caller already holds.' },
  { id: 2, letter: 'B', lineId: 3, title: 'What a phone can show', reason: 'The paragraph argues that the name and number displayed on an incoming call can be faked. The familiar bank number demonstrates the display that asks to be trusted.' },
  { id: 3, letter: 'C', lineId: 6, title: 'A deadline nobody set', reason: 'The paragraph argues that the urgency is manufactured. The offer to hold a transfer for two minutes demonstrates the window invented by the caller.' },
]

export const liftLineDetails = {
  1: { summary: 'Tuesday afternoon, the message', theory: 'atmosphere' },
  2: { summary: 'You begin to fret', theory: 'atmosphere' },
  3: { summary: 'The number on the screen', theory: 'provenance' },
  4: { summary: 'The branch and card digits', theory: 'knowledge' },
  5: { summary: 'Calm and professional', theory: 'demeanour' },
  6: { summary: 'She can hold it two minutes', theory: 'urgency' },
  7: { summary: 'An OTP is on its way', theory: 'credential request' },
  8: { summary: "She doesn't rush you", theory: 'demeanour' },
  9: { summary: 'Nothing feels wrong', theory: 'atmosphere' },
}
