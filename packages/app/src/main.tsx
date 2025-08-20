import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import CollectionList from './components/CollectionList.tsx'
import RestoreScroll from './components/RestoreScroll.tsx'
import Providers from './providers.tsx'
import Success from './routes/auth/github/Success.tsx'
import Collection from './routes/Collection.tsx'
import Eg from './routes/Eg.tsx'
import Layout from './routes/Layout.tsx'

createRoot(document.getElementById('root') ?? document.body).render(
  <StrictMode>
    <Providers>
      <Router>
        <RestoreScroll />
        <Routes>
          <Route path="/*" element={<Layout />}>
            <Route index element={<Navigate to="/vaults" replace />} />
            <Route path=":collection" element={<CollectionList />} />
            <Route path=":collection/:chainId/:address" element={<Collection />} />
            <Route path="auth/github/success" element={<Success />} />
            <Route path="eg" element={<Eg />} />
          </Route>
        </Routes>
      </Router>
    </Providers>
  </StrictMode>,
)
