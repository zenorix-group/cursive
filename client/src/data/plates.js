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
      points: '330,12 330,172 317,176 310,173 300,170 291,173 282,175 277,179 273,190 251,197 250,184 245,171 234,150 223,131 216,123 206,114 209,109 216,99 223,85 231,74 241,63 254,53 267,44 280,36 293,30 305,24 318,17',
    },
  ],
}

// SVG path covering the whole plate except the given polygon (even-odd), used to dim everything around a flag
export const outsidePath = (points, w, h) =>
  `M0 0H${w}V${h}H0Z M${points
    .split(' ')
    .map((p, i) => `${i ? 'L' : ''}${p.replace(',', ' ')}`)
    .join('')}Z`
