import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
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
import { Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import AuthLayout, { AuthAlert, authLinkSx } from '../../components/Auth/AuthLayout';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordFormData>();
  const password = watch('password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/reset-password', { token, password: data.password });
      navigate('/login', { replace: true, state: { notice: 'Password reset — sign in with your new password.' } });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not reset password, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="This link is missing its reset token">
        <AuthAlert severity="error">
          Open the link from your reset email again, or request a new one.
        </AuthAlert>
        <Button component={RouterLink} to="/forgot-password" fullWidth variant="contained" sx={{ py: 1.4 }}>
          Request a new link
        </Button>
      </AuthLayout>
    );
  }

  const visibilityToggle = (
    <InputAdornment position="end">
      <IconButton
        onClick={() => setShowPassword(!showPassword)}
        edge="end"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        sx={{ color: 'var(--fh-muted)' }}
      >
        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  const linkExpired = /invalid or has expired/i.test(error);

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a new password for your account">
      {error && (
        <AuthAlert severity="error">
          {error}
          {linkExpired && (
            <>
              {' '}
              <Link component={RouterLink} to="/forgot-password" sx={{ ...authLinkSx, fontSize: '0.82rem' }}>
                Request a new link
              </Link>
            </>
          )}
        </AuthAlert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="password"
          control={control}
          defaultValue=""
          rules={{ required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="New password"
              type={showPassword ? 'text' : 'password'}
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 2 }}
              autoComplete="new-password"
              autoFocus
              InputProps={{ endAdornment: visibilityToggle }}
            />
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          defaultValue=""
          rules={{
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Confirm new password"
              type={showPassword ? 'text' : 'password'}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              sx={{ mb: 3 }}
              autoComplete="new-password"
            />
          )}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isLoading}
          sx={{ py: 1.4, mb: 2.5, fontSize: '0.9rem' }}
        >
          {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Reset password'}
        </Button>

        <Typography sx={{ textAlign: 'center', fontSize: '0.83rem' }}>
          <Link component={RouterLink} to="/login" sx={{ ...authLinkSx, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <ArrowBack sx={{ fontSize: '1rem' }} /> Back to sign in
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
};

export default ResetPassword;
