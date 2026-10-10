import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { ColorModeProvider, useColorMode } from './contexts/ColorModeContext';
import { buildTheme } from './theme/buildTheme';
import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Portfolio from './pages/Portfolio/Portfolio';
import Stocks from './pages/Stocks/Stocks';
import MutualFunds from './pages/MutualFunds/MutualFunds';
import IPO from './pages/IPO/IPO';
import Trading from './pages/Trading/Trading';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import Expenses from './pages/Expenses/Expenses';
import CreditCards from './pages/CreditCards/CreditCards';
import EODDashboard from './pages/EODDashboard/EODDashboard';
import Optimization from './pages/Optimization/Optimization';
import CASUpload from './pages/CASUpload/CASUpload';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Rebuilds the MUI theme whenever the colour mode changes.
const ThemedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useColorMode();
  const theme = useMemo(() => buildTheme(mode), [mode]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

function App() {
  return (
    <ColorModeProvider>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemedApp>
          <CssBaseline />
          <AuthProvider>
            <SocketProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/portfolio" element={<Portfolio />} />
                            <Route path="/stocks" element={<Stocks />} />
                            <Route path="/mutual-funds" element={<MutualFunds />} />
                            <Route path="/ipo" element={<IPO />} />
                            <Route path="/trading" element={<Trading />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/credit-cards" element={<CreditCards />} />
                            <Route path="/eod-dashboard" element={<EODDashboard />} />
                            <Route path="/optimization" element={<Optimization />} />
                            <Route path="/cas-upload" element={<CASUpload />} />
                          </Routes>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Router>
            </SocketProvider>
          </AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--fh-paper)',
                color: 'var(--fh-text)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px var(--fh-shadow)',
              },
              success: {
                duration: 3000,
                iconTheme: { primary: 'var(--fh-up)', secondary: 'var(--fh-paper-solid)' },
              },
              error: {
                duration: 5000,
                iconTheme: { primary: 'var(--fh-down)', secondary: 'var(--fh-paper-solid)' },
              },
            }}
          />
        </ThemedApp>
      </QueryClientProvider>
    </HelmetProvider>
    </ColorModeProvider>
  );
}

export default App;
