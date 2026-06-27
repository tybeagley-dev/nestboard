import { useState } from 'react'
import { apiPost } from '../utils/api'

// Beta feedback / support contact + account-deletion request. Both post to
// /auth/family/feedback and land in the admin tooling for follow-up.
export default function FeedbackCard() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteRequested, setDeleteRequested] = useState(false)

  async function sendFeedback(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    const res = await apiPost('/auth/family/feedback', { type: 'feedback', message })
    setSending(false)
    if (res?.success) { setMessage(''); setSent(true) }
  }

  async function requestDeletion() {
    const res = await apiPost('/auth/family/feedback', { type: 'deletion_request' })
    if (res?.success) { setConfirmDelete(false); setDeleteRequested(true) }
  }

  return (
    <div className="family-code-card">
      <div className="family-code-section">
        <span className="family-code-label">Feedback &amp; support</span>
        <p className="family-code-hint">
          nestboard is in beta. Questions, bugs, or ideas? Send them here and we’ll get back to you.
        </p>
        <form onSubmit={sendFeedback}>
          <textarea
            className="chore-form-input"
            rows={3}
            value={message}
            onChange={e => { setMessage(e.target.value); setSent(false) }}
            placeholder="What’s on your mind?"
          />
          {sent && <p className="family-code-hint">Thanks — we got it.</p>}
          <button className="family-setup-submit" type="submit" disabled={sending || !message.trim()}>
            {sending ? 'Sending…' : 'Send feedback'}
          </button>
        </form>
      </div>

      <div className="family-code-section">
        <span className="family-code-label">Delete account</span>
        {deleteRequested ? (
          <p className="family-code-hint">
            We’ve received your request to delete this family’s data and will follow up.
          </p>
        ) : !confirmDelete ? (
          <>
            <p className="family-code-hint">
              Request permanent deletion of this family and all its data. We’ll confirm before anything is removed.
            </p>
            <button className="admin-btn admin-btn-danger" onClick={() => setConfirmDelete(true)}>
              Request account deletion
            </button>
          </>
        ) : (
          <>
            <p className="family-code-hint">
              This sends a deletion request to the nestboard team. Continue?
            </p>
            <div className="admin-delete-row">
              <button className="admin-btn admin-btn-danger" onClick={requestDeletion}>Yes, request deletion</button>
              <button className="admin-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
