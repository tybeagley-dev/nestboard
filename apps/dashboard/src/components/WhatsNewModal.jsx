import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { VISIBLE_RELEASES } from '../content/releases'
import { markReleasesSeen } from '../utils/releases'

export default function WhatsNewModal({ onClose }) {
  // Opening the modal is what counts as reading it — clears the dot.
  useEffect(() => { markReleasesSeen() }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card howto-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="howto-header">
          <h2 className="modal-title">What's new</h2>
          <p className="modal-points-line">Recent changes to nestboard.</p>
        </div>

        <div className="release-list">
          {VISIBLE_RELEASES.map(rel => (
            <section key={rel.version} className="release-entry">
              <div className="release-entry-head">
                <Sparkles size={16} strokeWidth={1.8} />
                <span className="release-entry-title">{rel.title}</span>
                <span className="release-entry-date">{rel.date}</span>
              </div>
              <ul className="release-items">
                {rel.items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
