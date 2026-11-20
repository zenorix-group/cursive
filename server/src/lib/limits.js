// Request limits per client address, shared by the routes that enforce them and the admin System page.
const HOUR = 60 * 60 * 1000;
const WINDOW = 15 * 60 * 1000;
module.exports = {
  signIn: { label: 'Sign in / register', max: 20, windowMs: WINDOW },
  narrative: { label: 'Narrative receipt (AI)', max: 12, windowMs: WINDOW },
  rearrange: { label: 'Re-Arrange receipt', max: 30, windowMs: WINDOW },
  cups: { label: 'Four Cups receipt', max: 30, windowMs: WINDOW },
  files: { label: 'Two Files receipt', max: 30, windowMs: WINDOW },
  highlights: { label: 'Hindsight Highlights receipt (AI)', max: 12, windowMs: WINDOW },
  combined: { label: 'Combined receipt email', max: 5, windowMs: HOUR },
};
