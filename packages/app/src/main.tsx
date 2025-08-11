import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import {
  Route, 
  BrowserRouter as Router,
  Routes
} from 'react-router-dom'
import RestoreScroll from './components/RestoreScroll.tsx'
import Providers from './providers.tsx'
import Success from './routes/auth/github/Success.tsx'
import Eg from './routes/Eg.tsx'
import Layout from './routes/Layout.tsx'
import Strategies from './routes/Strategies.tsx'
import Strategy from './routes/Strategy.tsx'
import Vault from './routes/Vault.tsx'
import Vaults from './routes/Vaults.tsx'

createRoot(document.getElementById('root') ?? document.body).render(
  <StrictMode>
    <Providers>
    <Router>
      <RestoreScroll />
      <Routes>
        <Route path="/*" element={<Layout />}>
          <Route index element={<Vaults />} />
          <Route path="vaults" element={<Vaults />} />
          <Route path="vaults/:chainId/:address" element={<Vault />} />
          <Route path="strategies" element={<Strategies />} />
          <Route path="strategies/:chainId/:address" element={<Strategy />} />
          <Route path="auth/github/success" element={<Success />} />
          <Route path="eg" element={<Eg />} />
        </Route>
      </Routes>
    </Router>
    </Providers>
  </StrictMode>
)
