import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
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

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    background: {
      default: '#060818',
      paper: '#0f172a',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
    },
    error: {
      main: '#f43f5e',
      light: '#fb7185',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
    },
    info: {
      main: '#06b6d4',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
    divider: 'rgba(148, 163, 184, 0.1)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem',   fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.75rem',fontWeight: 700 },
    h4: { fontSize: '1.5rem', fontWeight: 600 },
    h5: { fontSize: '1.25rem',fontWeight: 600 },
    h6: { fontSize: '1rem',   fontWeight: 600 },
    body1: { fontSize: '0.9rem' },
    body2: { fontSize: '0.8rem' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #060818 0%, #0d1117 50%, #060818 100%)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          borderRadius: 16,
          transition: 'all 0.3s ease',
          '&:hover': {
            border: '1px solid rgba(99, 102, 241, 0.4)',
            boxShadow: '0 8px 40px rgba(99, 102, 241, 0.15), 0 4px 24px rgba(0,0,0,0.5)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(15, 23, 42, 0.95)',
          backgroundImage: 'none',
          border: '1px solid rgba(99, 102, 241, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          letterSpacing: '0.01em',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 6px 24px rgba(99, 102, 241, 0.6)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
          boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
        },
        outlined: {
          borderColor: 'rgba(99, 102, 241, 0.4)',
          '&:hover': {
            borderColor: '#6366f1',
            background: 'rgba(99, 102, 241, 0.08)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(99, 102, 241, 0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#6366f1' },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        },
        head: {
          color: '#94a3b8',
          fontWeight: 700,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          background: 'rgba(6, 8, 24, 0.6)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            background: 'rgba(99, 102, 241, 0.06)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          background: 'rgba(99, 102, 241, 0.15)',
        },
        bar: {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': { color: '#6366f1' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          height: 3,
          borderRadius: 2,
        },
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <SocketProvider>
              <Router>
                <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
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
                </Box>
              </Router>
            </SocketProvider>
          </AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#e2e8f0',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              },
              success: {
                duration: 3000,
                iconTheme: { primary: '#10b981', secondary: '#0f172a' },
              },
              error: {
                duration: 5000,
                iconTheme: { primary: '#f43f5e', secondary: '#0f172a' },
              },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
