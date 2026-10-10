import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Skeleton,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Email,
  Phone,
  CreditCard,
  Edit,
  Settings,
  Security,
  Notifications,
  Help,
  Logout,
  TrendingUp,
  AccountBalance,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { PageHeaderSkeleton } from '../../components/Skeletons/Skeletons';

const maskPan = (pan?: string) =>
  pan && pan.length >= 4 ? `${'X'.repeat(Math.max(pan.length - 4, 0))}${pan.slice(-4)}` : '—';

const PageHeader: React.FC = () => (
  <Box sx={{ mb: 3, minWidth: 0 }}>
    <Typography
      variant="h4"
      sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: { xs: '1.6rem', md: '2.125rem' } }}
    >
      Profile
    </Typography>
    <Typography variant="body2" sx={{ color: 'var(--fh-muted)', mt: 0.5 }}>
      Your personal details, preferences and account security
    </Typography>
  </Box>
);

const FieldsSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <Grid container spacing={{ xs: 2, md: 3 }}>
    {Array.from({ length: count }).map((_, i) => (
      <Grid item xs={12} sm={6} key={i}>
        <Skeleton variant="rounded" height={56} />
      </Grid>
    ))}
  </Grid>
);

const ProfileSkeleton: React.FC = () => (
  <Box>
    <PageHeaderSkeleton withAction={false} />
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid item xs={12} md={4} xl={3}>
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={80} height={80} sx={{ mb: 1 }} />
            <Skeleton variant="text" sx={{ fontSize: '1.25rem', width: '60%' }} />
            <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '40%' }} />
            <Skeleton variant="rounded" width={64} height={24} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center' }}>
              {[0, 1, 2].map((i) => (
                <Box key={i} sx={{ flex: 1, maxWidth: 90 }}>
                  <Skeleton variant="circular" width={24} height={24} sx={{ mx: 'auto' }} />
                  <Skeleton variant="text" sx={{ fontSize: '0.75rem' }} />
                  <Skeleton variant="text" sx={{ fontSize: '0.875rem' }} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ mt: { xs: 2, md: 3 } }}>
          <CardContent>
            <Skeleton variant="text" sx={{ fontSize: '1.25rem', width: 140, mb: 1 }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                <Skeleton variant="circular" width={24} height={24} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '60%' }} />
                  <Skeleton variant="text" sx={{ fontSize: '0.75rem', width: '85%' }} />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8} xl={9}>
        <Card>
          <CardContent>
            <Skeleton variant="text" sx={{ fontSize: '1.25rem', width: 200, mb: 3 }} />
            <FieldsSkeleton count={6} />
          </CardContent>
        </Card>
        <Card sx={{ mt: { xs: 2, md: 3 } }}>
          <CardContent>
            <Skeleton variant="text" sx={{ fontSize: '1.25rem', width: 200, mb: 2 }} />
            <FieldsSkeleton count={4} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

const Profile: React.FC = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(editForm);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      // changePassword shows its own success/error toast.
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setOpenPasswordDialog(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch {
      // Keep the dialog open so the user can correct the current password.
    }
  };

  const menuItems = [
    { icon: <Settings />, label: 'Account Settings', description: 'Manage your account preferences' },
    { icon: <Security />, label: 'Security', description: 'Password and authentication settings' },
    { icon: <Notifications />, label: 'Notifications', description: 'Configure notification preferences' },
    { icon: <Help />, label: 'Help & Support', description: 'Get help and contact support' },
  ];

  const stats = [
    { icon: <AccountBalance />, label: 'Portfolio Value', value: '₹2,45,678', color: 'primary' },
    { icon: <TrendingUp />, label: 'Total Returns', value: '+12.5%', color: 'success' },
    { icon: <CreditCard />, label: 'Active Accounts', value: '2', color: 'info' },
  ];

  if (!user) {
    return <ProfileSkeleton />;
  }

  const prefs = user.preferences;
  const plan = user.subscription?.plan ?? 'free';
  const initials = `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <Box>
      <PageHeader />

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={4} xl={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, #6366f1 0%, var(--fh-info) 100%)',
                  color: '#fff',
                  fontSize: '2rem',
                  fontWeight: 700,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {initials || '?'}
              </Avatar>

              <Typography variant="h6" gutterBottom noWrap sx={{ color: 'var(--fh-text)', fontWeight: 700 }}>
                {user.firstName} {user.lastName}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                @{user.username}
              </Typography>

              <Chip
                label={plan.toUpperCase()}
                color={plan === 'premium' ? 'primary' : 'default'}
                size="small"
                sx={{ mb: 2 }}
              />

              <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
                {stats.map((stat, index) => (
                  <Box key={index} sx={{ textAlign: 'center', px: 1, flex: '1 1 80px', minWidth: 0 }}>
                    <Box color={`${stat.color}.main`} sx={{ fontSize: '1.5rem' }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {stat.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {stat.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: { xs: 2, md: 3 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'var(--fh-text)', fontWeight: 600 }}>
                Quick Actions
              </Typography>
              <List dense disablePadding>
                {menuItems.map((item, index) => (
                  <ListItem key={index} button sx={{ borderRadius: 2 }}>
                    <ListItemIcon sx={{ color: 'var(--fh-text-3)', minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.description}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItem>
                ))}
                <Divider sx={{ my: 1 }} />
                <ListItem button onClick={logout} sx={{ borderRadius: 2 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}><Logout color="error" /></ListItemIcon>
                  <ListItemText
                    primary="Logout"
                    primaryTypographyProps={{ color: 'error' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8} xl={9}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} mb={3}>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'var(--fh-text)' }}>
                  Personal Information
                </Typography>
                <Tooltip title={isEditing ? 'Stop editing' : 'Edit profile'}>
                  <IconButton onClick={() => setIsEditing(!isEditing)} color={isEditing ? 'primary' : 'default'}>
                    <Edit />
                  </IconButton>
                </Tooltip>
              </Box>

              <Grid container spacing={{ xs: 2, md: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={isEditing ? editForm.firstName : user.firstName}
                    disabled={!isEditing}
                    onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={isEditing ? editForm.lastName : user.lastName}
                    disabled={!isEditing}
                    onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={user.username}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={user.email}
                    disabled
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={isEditing ? editForm.phone : user.phone}
                    disabled={!isEditing}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="PAN Card"
                    value={maskPan(user.panCard)}
                    disabled
                    InputProps={{
                      startAdornment: <CreditCard sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
              </Grid>

              {isEditing && (
                <Box display="flex" gap={2} mt={3} flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={saving}
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        phone: user.phone,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: { xs: 2, md: 3 } }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'var(--fh-text)' }}>
                  Account Preferences
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Security />}
                  onClick={() => setOpenPasswordDialog(true)}
                >
                  Change Password
                </Button>
              </Box>

              <Grid container spacing={{ xs: 2, md: 3 }}>
                <Grid item xs={12} sm={6} lg={3}>
                  <TextField
                    fullWidth
                    label="Default Market"
                    value={prefs?.defaultMarket === 'indian' ? 'Indian Market' : prefs?.defaultMarket ? 'US Market' : '—'}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <TextField
                    fullWidth
                    label="Currency"
                    value={prefs?.currency ?? '—'}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <TextField
                    fullWidth
                    label="Risk Profile"
                    value={prefs?.riskProfile ?? '—'}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <TextField
                    fullWidth
                    label="Timezone"
                    value={prefs?.timezone ?? '—'}
                    disabled
                  />
                </Grid>
              </Grid>

              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: 'var(--fh-text-3)' }}>
                  Notification Preferences
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {([
                    ['Email', prefs?.notifications?.email],
                    ['SMS', prefs?.notifications?.sms],
                    ['Push', prefs?.notifications?.push],
                  ] as const).map(([label, on]) => (
                    <Chip
                      key={label}
                      label={`${label} ${on ? 'ON' : 'OFF'}`}
                      color={on ? 'success' : 'default'}
                      variant={on ? 'filled' : 'outlined'}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={openPasswordDialog}
        onClose={() => setOpenPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenPasswordDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleChangePassword}>
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
