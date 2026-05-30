import { Routes, Route } from 'react-router-dom'
import Dashboard from './Dashboard'
import ParentPage from './ParentPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/parent" element={<ParentPage />} />
    </Routes>
  )
}
