// Plate I: "Extradition & Cyber-Fraud". Hotspot polygons are in the plate image's own pixel space (349 x 462).
export const plate1 = {
  id: 1,
  numeral: 'I',
  title: 'Extradition & Cyber-Fraud',
  prompt: 'Point on any of the flag',
  size: { w: 349, h: 462 },
  flags: [
    {
      id: 'uk',
      segment: 'West Segment',
      country: 'United Kingdom',
      accept: ['united kingdom', 'uk'],
      next: '/article/1',
      points: '13,5 331,5 300,16 269,36 249,49 234,61 225,73 217,95 211,107 193,102 182,103 170,109 152,125 134,148 115,165 114,118 112,116 108,108 104,97 100,87 96,97 92,108 88,118 88,170 84,170 65,172 45,164 42,158 37,175 30,165 25,175 19,161 15,179 13,164',
    },
    {
      id: 'in',
      segment: 'East Segment',
      country: 'India',
      accept: ['india'],
      next: '/article/2',
      // The whole India scene: follow the hood/shoulder to the laptop, then the right picture edge.
      points: '330,7 330,348 326,354 270,346 253,305 237,270 229,253 237,242 245,229 250,214 252,200 249,185 243,165 235,146 224,127 211,111 219,95 225,80 234,66 248,54 267,40 290,26 310,17',
    },
  ],
}

// SVG path covering the whole plate except the given polygon (even-odd), used to dim everything around a flag
export const outsidePath = (points, w, h) =>
  `M0 0H${w}V${h}H0Z M${points
    .split(' ')
    .map((p, i) => `${i ? 'L' : ''}${p.replace(',', ' ')}`)
    .join('')}Z`
