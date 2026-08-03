import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context.tsx';
import Layout from './components/Layout.tsx';

// Pages
import HomePage from './pages/HomePage.tsx';
import MapPage from './pages/MapPage.tsx';
import ActivitiesPage from './pages/ActivitiesPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import LeaderboardPage from './pages/LeaderboardPage.tsx';
import RapidResponsePage from './pages/RapidResponsePage.tsx';
import CheckinPage from './pages/CheckinPage.tsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="rapid-response" element={<RapidResponsePage />} />
            <Route path="checkin" element={<CheckinPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

