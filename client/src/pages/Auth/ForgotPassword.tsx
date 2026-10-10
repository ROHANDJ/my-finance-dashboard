import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Button, Typography, Link, CircularProgress } from '@mui/material';
import { ArrowBack, MarkEmailRead } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import AuthLayout, { AuthAlert, authLinkSx } from '../../components/Auth/AuthLayout';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [sentTo,    setSentTo]    = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/forgot-password', { email: data.email });
      setSentTo(data.email);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not send reset email, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const backToLogin = (
    <Typography sx={{ textAlign: 'center', fontSize: '0.83rem' }}>
      <Link component={RouterLink} to="/login" sx={{ ...authLinkSx, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <ArrowBack sx={{ fontSize: '1rem' }} /> Back to sign in
      </Link>
    </Typography>
  );

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent you a link to reset your password">
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <MarkEmailRead sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
          <Typography sx={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.7 }}>
            If an account exists for <Box component="span" sx={{ color: '#e2e8f0', fontWeight: 600 }}>{sentTo}</Box>,
            you'll get an email with a reset link shortly. The link expires in 30 minutes.
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.8rem', mt: 2 }}>
            Don't see it? Check your spam folder, or{' '}
            <Link component="button" type="button" onClick={() => setSentTo('')} sx={{ ...authLinkSx, fontSize: '0.8rem', verticalAlign: 'baseline' }}>
              try again
            </Link>.
          </Typography>
        </Box>
        {backToLogin}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your account email and we'll send you a reset link">
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
              sx={{ mb: 3 }}
              autoComplete="email"
              autoFocus
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
          {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Send reset link'}
        </Button>

        {backToLogin}
      </Box>
    </AuthLayout>
  );
};

export default ForgotPassword;
