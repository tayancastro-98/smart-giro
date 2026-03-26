import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { Login } from './pages/admin/Login';
import { AdminLayout } from './components/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Tournaments } from './pages/admin/Tournaments';
import { Teams } from './pages/admin/Teams';
import { Matches } from './pages/admin/Matches';
import { ScoreEntry } from './pages/admin/ScoreEntry';
import { Home } from './pages/public/Home';
import { Bracket } from './pages/public/Bracket';
import { MatchView } from './pages/public/MatchView';
import { Settings } from './pages/admin/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-200">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/torneio/:catId" element={<Bracket />} />
            <Route path="/torneio/:catId/partida/:matchId" element={<MatchView />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<Login />} />
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="torneios" element={<Tournaments />} />
              <Route path="equipes" element={<Teams />} />
              <Route path="partidas" element={<Matches />} />
              <Route path="partidas/:matchId/placar" element={<ScoreEntry />} />
              <Route path="configuracoes" element={<Settings />} />
            </Route>

            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
