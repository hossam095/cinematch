import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigation } from './components/Navigation'
import { Home } from './pages/Home'
import { Discover } from './pages/Discover'
import { MovieDetail } from './pages/MovieDetail'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Onboarding } from './pages/Onboarding'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 2 * 60 * 1000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Pages without nav */}
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Pages with nav */}
          <Route
            path="/*"
            element={
              <>
                <Navigation />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/movie/:id" element={<MovieDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
