import { useState, useEffect } from 'react'
import { useScreenBalance, startChildTimer } from '../hooks/useScreenTime'
import { useChorePoints } from '../hooks/useChores'
import BuckBadge from './BuckBadge'
import { apiGet, apiPost } from '../utils/api'

const PHASE          = { VIEW: 'view', BUY: 'buy' }
const BUCKS_PER_STEP = 5    // bucks per 10-minute increment
const MINS_PER_STEP  = 10   // minutes per stepper step

export default function ScreenTimeModal({ child, onClose }) {
  const { balance, purchasedBalance, dailyFreeAvailable } = useScreenBalance(child.name)
  const { bucks } = useChorePoints(child.name)
  const [phase,          setPhase]          = useState(PHASE.VIEW)
  const [steps,          setSteps]          = useState(1)   // stepper unit: 1 step = 10 min = 5 bucks
  const [pendingRequest, setPendingRequest] = useState(undefined)  // undefined=loading, null=none, obj=exists
  const [requestSent,    setRequestSent]    = useState(false)
  const [requestError,   setRequestError]   = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    async function checkPending() {
      const data = await apiGet(`/screen-time/${child.name}/pending-purchase-request`)
      setPendingRequest(data ?? null)
    }
    checkPending()
  }, [child.name])

  async function handleRequest() {
    setRequestError(null)
    const minutesAmount = steps * MINS_PER_STEP
    const result = await apiPost(`/screen-time/${child.name}/request-purchase`, { minutesAmount })
    if (result?.success) {
      setRequestSent(true)
      setPendingRequest({ minutes_amount: minutesAmount, bucks_amount: steps * BUCKS_PER_STEP })
      setPhase(PHASE.VIEW)
    } else {
      setRequestError(result?.error ?? 'Something went wrong. Try again.')
    }
  }

  function handleStart() {
    startChildTimer(child.name)
    onClose()
  }

  const maxSteps     = Math.floor(bucks / BUCKS_PER_STEP)
  const canRequest   = maxSteps > 0 && pendingRequest === null
  const minutesGained = steps * MINS_PER_STEP
  const bucksCost     = steps * BUCKS_PER_STEP

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card st-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="modal-child-header">
          <div className="modal-avatar" style={{ background: child.color }}>
            {child.emoji}
          </div>
          <div>
            <h2 className="modal-title">{child.name}</h2>
            <p className="modal-points-line">Screen Time</p>
          </div>
        </div>

        {phase === PHASE.VIEW && (
          <>
            <div className="st-balance-display">
              <span className="st-balance-num">{balance}</span>
              <span className="st-balance-unit">min available</span>
            </div>

            {(dailyFreeAvailable > 0 || purchasedBalance > 0) && (
              <div className="st-balance-breakdown">
                {dailyFreeAvailable > 0 && (
                  <span className="st-bucket st-bucket-free">{dailyFreeAvailable}m free today</span>
                )}
                {purchasedBalance > 0 && (
                  <span className="st-bucket st-bucket-banked">{purchasedBalance}m banked</span>
                )}
              </div>
            )}

            {balance > 0 && (
              <button className="btn-start-timer st-start" onClick={handleStart}>
                Start Timer
              </button>
            )}

            {!balance && (
              <p className="st-empty">No screen time available.</p>
            )}

            {requestSent && (
              <p className="st-request-sent">Request sent — waiting for parent approval.</p>
            )}

            {!requestSent && pendingRequest && (
              <p className="st-request-sent">
                Request pending: {pendingRequest.minutes_amount}m for <BuckBadge amount={pendingRequest.bucks_amount} />
              </p>
            )}

            {!requestSent && canRequest && (
              <button
                className="btn-spend"
                onClick={() => { setSteps(1); setPhase(PHASE.BUY) }}
              >
                Request More Screen Time
              </button>
            )}
          </>
        )}

        {phase === PHASE.BUY && (
          <div className="bucks-spend-phase">
            <p className="spend-prompt">Request More Screen Time</p>
            <div className="spend-stepper">
              <button
                className="stepper-btn"
                onClick={() => setSteps(s => Math.max(1, s - 1))}
                disabled={steps <= 1}
              >−</button>
              <span className="stepper-value adjust-value adding">
                {minutesGained} min
              </span>
              <button
                className="stepper-btn"
                onClick={() => setSteps(s => Math.min(maxSteps, s + 1))}
                disabled={steps >= maxSteps}
              >+</button>
            </div>
            <p className="spend-remaining">
              <strong>{minutesGained} min</strong> → <BuckBadge amount={bucksCost} />
            </p>
            <p className="trade-balance-after">
              Bucks after approval: <BuckBadge amount={Math.max(0, bucks - bucksCost)} />
            </p>
            {requestError && <p className="st-request-error">{requestError}</p>}
            <div className="spend-actions">
              <button className="btn-confirm-spend btn-confirm-add" onClick={handleRequest}>
                Send Request
              </button>
              <button className="btn-cancel-spend" onClick={() => { setPhase(PHASE.VIEW); setRequestError(null) }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
