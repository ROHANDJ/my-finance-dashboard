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
  Visibility,
  VisibilityOff,
  ArrowForward,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout, { AuthAlert, authLinkSx } from '../../components/Auth/AuthLayout';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, devLogin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');

  const from = (location.state as any)?.from?.pathname || '/dashboard';
  const notice = (location.state as any)?.notice as string | undefined;

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

  const handleDevLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await devLogin();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Dev login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to your dashboard">
      {notice && !error && <AuthAlert severity="success">{notice}</AuthAlert>}
      {error && <AuthAlert severity="error">{error}</AuthAlert>}

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
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      sx={{ color: '#64748b' }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 2.5 }}>
          <Link component={RouterLink} to="/forgot-password" sx={{ ...authLinkSx, fontSize: '0.8rem' }}>
            Forgot password?
          </Link>
        </Box>

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
            onClick={handleDevLogin}
            disabled={isLoading}
            sx={{ mb: 2, borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', '&:hover': { borderColor: '#f59e0b', background: 'rgba(245,158,11,0.08)' } }}
          >
            Dev Quick Login
          </Button>
        )}

        <Typography sx={{ textAlign: 'center', color: '#64748b', fontSize: '0.83rem' }}>
          No account?{' '}
          <Link component={RouterLink} to="/register" sx={authLinkSx}>
            Create one
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
};

export default Login;
