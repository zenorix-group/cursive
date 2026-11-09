import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { callLines, loadCallProgress, saveCallProgress, toggleCallLine } from '../data/callProgress.js'
import './CallTranscript.css'

function CallTranscript() {
  const navigate = useNavigate()
  const location = useLocation()
  const [progress, setProgress] = useState(loadCallProgress)
  const count = progress.selectedIds.length

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => { saveCallProgress(progress) }, [progress])

  const proceed = () => {
    saveCallProgress(progress)
    navigate('/read/2', { state: { game: true, returnScrollY: location.state?.returnScrollY ?? 790 } })
  }

  return (
    <main className="call-page">
      <header className="call__bar"><Link to="/">cursive</Link></header>
      <div className="call__body">
        <header className="call__intro">
          <p className="call__eyebrow">Article 02 / 05 min</p>
          <p className="call__eyebrow">A clinical dissection of deceit</p>
          <div className="call__title-row"><h1>The Call</h1><span>Transcript · 9 lines</span></div>
        </header>
        <p className="call__description">Consider the following realistic transcript of an incident recorded on a domestic savings account. Notice how ordinary each sentence appears in isolation.</p>
        <fieldset className="call__transcript">
          <legend className="call__sr-only">Select up to five lines from the call transcript</legend>
          {callLines.map((line) => <span key={line.id}>
            <label className="call__line">
              <input
                type="checkbox"
                aria-label={`S${line.id}: ${line.text}`}
                checked={progress.selectedIds.includes(line.id)}
                disabled={count === 5 && !progress.selectedIds.includes(line.id)}
                onChange={() => setProgress((previous) => toggleCallLine(previous, line.id))}
              />
              <span>[S{line.id}] {line.text}</span>
            </label>{' '}
          </span>)}
        </fieldset>
        <footer className={`call__footer${count === 5 ? ' call__footer--complete' : ''}`}>
          <button type="button" className="call__continue" disabled={count !== 5} onClick={proceed}>Selected {count} / 5 <span aria-hidden="true">→</span></button>
          {count < 5 && <button type="button" className="call__skip" onClick={proceed}>Proceed with {count}</button>}
          <span className="call__sr-only" role="status" aria-live="polite">{count} of 5 lines selected.{count === 5 ? ' Deselect a line to choose a different one.' : ''}</span>
        </footer>
      </div>
    </main>
  )
}

export default CallTranscript
