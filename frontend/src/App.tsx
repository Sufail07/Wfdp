import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DecisionBrief } from './features/brief/DecisionBrief'
import { Accuracy } from './features/accuracy/Accuracy'
import { Method } from './features/method/Method'

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DecisionBrief />} />
        <Route path="/accuracy" element={<Accuracy />} />
        <Route path="/method" element={<Method />} />
      </Routes>
    </AppShell>
  )
}

export default App
