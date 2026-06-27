import { useNavigate } from 'react-router-dom'
import privacyMd from '../legal/privacy.md?raw'
import termsMd from '../legal/terms.md?raw'

const DOCS = { privacy: privacyMd, terms: termsMd }

// Inline **bold** → <strong>, everything else passes through as text.
function inline(text, keyBase) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>
      : part
  )
}

// Minimal block-level markdown: #/##/### headings, - lists, blank-line paragraphs.
function render(md) {
  const lines = md.split('\n')
  const out = []
  let list = null
  const flushList = () => { if (list) { out.push(<ul key={`ul-${out.length}`}>{list}</ul>); list = null } }

  lines.forEach((line, i) => {
    if (line.startsWith('- ')) {
      list = list ?? []
      list.push(<li key={`li-${i}`}>{inline(line.slice(2), `li-${i}`)}</li>)
      return
    }
    flushList()
    if (!line.trim()) return
    if (line.startsWith('### ')) out.push(<h3 key={i}>{inline(line.slice(4), i)}</h3>)
    else if (line.startsWith('## ')) out.push(<h2 key={i}>{inline(line.slice(3), i)}</h2>)
    else if (line.startsWith('# ')) out.push(<h1 key={i}>{inline(line.slice(2), i)}</h1>)
    else out.push(<p key={i}>{inline(line, i)}</p>)
  })
  flushList()
  return out
}

export default function LegalDoc({ which }) {
  const navigate = useNavigate()
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
  return (
    <div className="legal-page">
      <div className="legal-doc-inner">
        <div className="legal-doc">{render(DOCS[which] ?? '')}</div>
        <button className="family-setup-submit" onClick={goBack}>Back</button>
      </div>
    </div>
  )
}
