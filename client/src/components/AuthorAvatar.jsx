import { authorPhoto, initialsOf } from '../data/authors.js'

// the author's round picture beside the byline, or their initials in the same circle when there is no picture yet
function AuthorAvatar({ name, className = 'read__avatar' }) {
  const photo = authorPhoto(name)
  if (photo) return <img className={className} src={photo} alt={`${name}, profile photo`} />
  return <span className={`${className} ${className}--initials`} aria-hidden="true">{initialsOf(name)}</span>
}

export default AuthorAvatar
