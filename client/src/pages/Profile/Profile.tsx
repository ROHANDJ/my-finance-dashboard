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
  IconButton,
} from '@mui/material';
import {
  Person,
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

const Profile: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
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
    try {
      await updateProfile(editForm);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setOpenPasswordDialog(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error('Failed to change password');
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
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Profile
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </Avatar>
              
              <Typography variant="h6" gutterBottom>
                {user.firstName} {user.lastName}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                @{user.username}
              </Typography>
              
              <Chip
                label={user.subscription.plan.toUpperCase()}
                color={user.subscription.plan === 'premium' ? 'primary' : 'default'}
                size="small"
                sx={{ mb: 2 }}
              />

              <Box display="flex" justifyContent="center" gap={1}>
                {stats.map((stat, index) => (
                  <Box key={index} sx={{ textAlign: 'center', px: 1 }}>
                    <Box color={`${stat.color}.main`} sx={{ fontSize: '1.5rem' }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="caption" display="block">
                      {stat.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {stat.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <List dense>
                {menuItems.map((item, index) => (
                  <ListItem key={index} button>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.description}
                    />
                  </ListItem>
                ))}
                <Divider />
                <ListItem button onClick={logout}>
                  <ListItemIcon><Logout color="error" /></ListItemIcon>
                  <ListItemText
                    primary="Logout"
                    primaryTypographyProps={{ color: 'error' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={600}>
                  Personal Information
                </Typography>
                <IconButton onClick={() => setIsEditing(!isEditing)}>
                  <Edit />
                </IconButton>
              </Box>

              <Grid container spacing={3}>
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
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={user.username}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
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
                    value="XXXXX1234X"
                    disabled
                    InputProps={{
                      startAdornment: <CreditCard sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
              </Grid>

              {isEditing && (
                <Box display="flex" gap={2} mt={3}>
                  <Button
                    variant="contained"
                    onClick={handleUpdateProfile}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outlined"
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

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Account Preferences
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Default Market"
                    value={user.preferences.defaultMarket === 'indian' ? 'Indian Market' : 'US Market'}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Currency"
                    value={user.preferences.currency}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Risk Profile"
                    value={user.preferences.riskProfile}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Timezone"
                    value={user.preferences.timezone}
                    disabled
                  />
                </Grid>
              </Grid>

              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Notification Preferences
                </Typography>
                <Box display="flex" gap={2}>
                  <Chip
                    label={user.preferences.notifications.email ? 'Email ON' : 'Email OFF'}
                    color={user.preferences.notifications.email ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip
                    label={user.preferences.notifications.sms ? 'SMS ON' : 'SMS OFF'}
                    color={user.preferences.notifications.sms ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip
                    label={user.preferences.notifications.push ? 'Push ON' : 'Push OFF'}
                    color={user.preferences.notifications.push ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>

              <Box mt={3}>
                <Button
                  variant="outlined"
                  onClick={() => setOpenPasswordDialog(true)}
                >
                  Change Password
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
            />
            <Box display="flex" gap={2}>
              <Button onClick={() => setOpenPasswordDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleChangePassword}>
                Change Password
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Profile;
