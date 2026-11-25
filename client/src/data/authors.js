import monica from '../assets/authors/monica-behura.webp'
import sampurna from '../assets/authors/sampurna-majumder.jpg'
import bonnie from '../assets/authors/bonnie-wiseman.jpg'
import maria from '../assets/authors/maria-gessy-de-sales.jpg'
import saumya from '../assets/authors/saumya-dikshit.jpg'

// The authors of the seven articles and their pictures; an author without one shows their initials.
// Article 1: Monica Behura. Articles 2 and 3: Sampurna Majumder. Article 4: Bonnie Wiseman. Article 5: Maria Gessy De Sales.
// Article 6: Saumya Dikshit. Article 7: Azli Nor (no picture).
export const AUTHOR_PHOTOS = {
  'Monica Behura': monica,
  'Sampurna Majumder': sampurna,
  'Bonnie Wiseman': bonnie,
  'Maria Gessy De Sales': maria,
  'Saumya Dikshit': saumya,
}

export const authorPhoto = (name) => AUTHOR_PHOTOS[name] ?? null
export const initialsOf = (name) => name.replace(/^Dr\.\s*/, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
