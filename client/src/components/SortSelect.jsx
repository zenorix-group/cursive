import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// the app's own dropdown, used in place of a native <select> (which hands the list to the operating system)
function SortSelect({ value, options, onChange, label = 'Sort' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listId = useId()
  const selected = options.findIndex((option) => option.value === value)
  const current = options[selected] ?? options[0]

  const openList = () => { setActive(Math.max(selected, 0)); setOpen(true) }
  const closeList = (restoreFocus = true) => { setOpen(false); if (restoreFocus) buttonRef.current?.focus() }
  const choose = (index) => { onChange(options[index].value); closeList() }

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onKeyDown = (event) => {
    const last = options.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); openList() }
      return
    }
    if (event.key === 'Escape') { event.preventDefault(); closeList() }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, last)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0) }
    else if (event.key === 'End') { event.preventDefault(); setActive(last) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(active) }
    else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className={`r-sort${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="r-sort__btn"
        aria-label={`${label}: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span>{current.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="#0E1118" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            className="r-sort__list"
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={index === selected}
                className={`r-sort__opt${index === active ? ' is-active' : ''}${index === selected ? ' is-selected' : ''}`}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span className="r-sort__tick" aria-hidden="true">
                  {index === selected && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5.2l3.2 3.2L11 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                {option.label}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SortSelect
