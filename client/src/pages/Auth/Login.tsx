import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  ShowChart,
  Visibility,
  VisibilityOff,
  ArrowForward,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const devLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await login('dev@dev.com', 'dev123');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Dev login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: '#060818',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blobs */}
      <Box sx={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', top: '40%', right: '15%',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left panel — branding */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          px: 8,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(99,102,241,0.5)',
          }}>
            <ShowChart sx={{ color: '#fff', fontSize: '1.3rem' }} />
          </Box>
          <Typography sx={{
            fontWeight: 800, fontSize: '1.3rem',
            background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            FinanceHub
          </Typography>
        </Box>

        <Typography variant="h2" sx={{ fontWeight: 800, color: '#e2e8f0', mb: 2, lineHeight: 1.15 }}>
          Your money,<br />
          <Box component="span" sx={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            under control.
          </Box>
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '1rem', maxWidth: 400, lineHeight: 1.7 }}>
          Track your portfolio, manage expenses, monitor mutual funds, and get AI-powered insights — all in one place.
        </Typography>

        {/* Stat chips */}
        <Box sx={{ display: 'flex', gap: 2, mt: 5, flexWrap: 'wrap' }}>
          {[
            { label: 'Portfolio Tracking', color: '#6366f1' },
            { label: 'Mutual Funds',       color: '#06b6d4' },
            { label: 'Expense Manager',    color: '#10b981' },
            { label: 'AI Chatbot',         color: '#8b5cf6' },
          ].map(f => (
            <Box key={f.label} sx={{
              px: 1.5, py: 0.6,
              borderRadius: '8px',
              background: `${f.color}18`,
              border: `1px solid ${f.color}33`,
              color: f.color,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              {f.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right panel — form */}
      <Box
        sx={{
          width: { xs: '100%', md: 480 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, md: 6 },
          py: 6,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 400,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '20px',
            p: { xs: 3, md: 4 },
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
            }}>
              <ShowChart sx={{ color: '#fff', fontSize: '1rem' }} />
            </Box>
            <Typography sx={{
              fontWeight: 800, fontSize: '1rem',
              background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              FinanceHub
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: '#e2e8f0', mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 3 }}>
            Sign in to continue to your dashboard
          </Typography>

          {error && (
            <Box sx={{
              mb: 2.5, p: 1.5, borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
            }}>
              <Typography sx={{ color: '#f43f5e', fontSize: '0.82rem' }}>{error}</Typography>
            </Box>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="email"
              control={control}
              defaultValue=""
              rules={{
                required: 'Email is required',
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ mb: 2 }}
                  autoComplete="email"
                  autoFocus
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              defaultValue=""
              rules={{ required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{ mb: 3 }}
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#64748b' }}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              endIcon={!isLoading && <ArrowForward />}
              sx={{ py: 1.4, mb: 2, fontSize: '0.9rem' }}
            >
              {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>

            {process.env.NODE_ENV !== 'production' && (
              <Button
                fullWidth
                variant="outlined"
                onClick={devLogin}
                disabled={isLoading}
                sx={{ mb: 2, borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', '&:hover': { borderColor: '#f59e0b', background: 'rgba(245,158,11,0.08)' } }}
              >
                Dev Quick Login
              </Button>
            )}

            <Typography sx={{ textAlign: 'center', color: '#64748b', fontSize: '0.83rem' }}>
              No account?{' '}
              <Link
                component={RouterLink}
                to="/register"
                sx={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Create one
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
