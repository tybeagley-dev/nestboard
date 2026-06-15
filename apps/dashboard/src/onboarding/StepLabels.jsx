import { useState } from 'react'
import { apiPut } from '../utils/api'
import { useFamily } from '../FamilyContext'

// Lets a family name their token/rewards system. Blank = generic defaults.
export default function StepLabels() {
  const family = useFamily()
  const initial = family?.labels ?? {}
  const [tokenName,         setTokenName]         = useState(initial.tokenName ?? '')
  const [tokenNameSingular, setTokenNameSingular] = useState(initial.tokenNameSingular ?? '')
  const [rewardsName,       setRewardsName]       = useState(initial.rewardsName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  function edit(setter) {
    return e => { setter(e.target.value); setSaved(false) }
  }

  async function save() {
    setSaving(true)
    await apiPut('/auth/family/labels', { tokenName, tokenNameSingular, rewardsName })
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="onboarding-labels">
      <p className="onboarding-help">
        Want custom names? Leave any blank to use the defaults — <strong>Tokens</strong> and <strong>Rewards Store</strong>.
      </p>
      <div className="chore-form-field">
        <label className="chore-form-label">Token name (plural)</label>
        <input className="chore-form-input" value={tokenName} onChange={edit(setTokenName)} placeholder="Tokens" />
      </div>
      <div className="chore-form-field">
        <label className="chore-form-label">Token name (singular)</label>
        <input className="chore-form-input" value={tokenNameSingular} onChange={edit(setTokenNameSingular)} placeholder="Token" />
      </div>
      <div className="chore-form-field">
        <label className="chore-form-label">Rewards store name</label>
        <input className="chore-form-input" value={rewardsName} onChange={edit(setRewardsName)} placeholder="Rewards Store" />
      </div>
      <button className="parent-apply-btn" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save names'}
      </button>
    </div>
  )
}
