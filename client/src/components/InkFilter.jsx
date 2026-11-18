// The wet-ink look of the article titles: the same filter the first two articles define in their own pages.
function InkFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false">
      <filter id="wet-ink" x="-2%" y="-5%" width="104%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
      </filter>
    </svg>
  )
}

export default InkFilter
