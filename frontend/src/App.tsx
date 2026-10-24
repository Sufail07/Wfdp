import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DecisionBrief } from './features/brief/DecisionBrief'
import { Accuracy } from './features/accuracy/Accuracy'
import { Method } from './features/method/Method'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DecisionBrief />} />
        <Route path="/accuracy" element={<Accuracy />} />
        <Route path="/method" element={<Method />} />
      </Routes>
    </Layout>
  )
}

export default App