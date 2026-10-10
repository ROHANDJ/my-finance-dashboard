import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Switch,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
} from '@mui/material';
import {
  Notifications,
  Security,
  Language,
  Palette,
  Info,
  Save,
  Restore,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useColorMode, ColorModePreference } from '../../contexts/ColorModeContext';

/** Card heading with a leading icon, shared by every settings section. */
const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'var(--fh-text)' }}>
    <Box sx={{ color: 'var(--fh-indigo)', display: 'flex' }}>{icon}</Box>
    <Typography variant="h6" fontWeight={600} noWrap>
      {children}
    </Typography>
  </Box>
);

/** One toggle row: label + description on the left, switch on the right. */
const ToggleRow: React.FC<{
  primary: string;
  secondary: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ primary, secondary, checked, onChange }) => (
  <ListItem disableGutters sx={{ gap: 2, py: 1 }}>
    <ListItemText
      primary={primary}
      secondary={secondary}
      sx={{ minWidth: 0, my: 0 }}
      primaryTypographyProps={{ color: 'var(--fh-text)', fontWeight: 500 }}
    />
    <Switch
      edge="end"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      inputProps={{ 'aria-label': primary }}
      sx={{ flexShrink: 0 }}
    />
  </ListItem>
);

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    {children}
  </Box>
);

const Settings: React.FC = () => {
  const { preference: colorPreference, setPreference: setColorPreference } = useColorMode();
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    priceAlerts: true,
    newsAlerts: true,
    portfolioUpdates: true,
  });

  const [preferences, setPreferences] = useState({
    defaultMarket: 'indian',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    language: 'en',
    theme: 'dark',
    riskProfile: 'moderate',
  });

  const [privacy, setPrivacy] = useState({
    shareData: false,
    analytics: true,
    marketing: false,
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    setNotifications({
      email: true,
      sms: false,
      push: true,
      priceAlerts: true,
      newsAlerts: true,
      portfolioUpdates: true,
    });
    setPreferences({
      defaultMarket: 'indian',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      language: 'en',
      theme: 'dark',
      riskProfile: 'moderate',
    });
    setPrivacy({
      shareData: false,
      analytics: true,
      marketing: false,
    });
    toast('Settings reset to default');
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: { xs: '1.6rem', md: '2.125rem' } }}
          >
            Settings
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)', mt: 0.5 }}>
            Notifications, trading preferences, appearance and privacy
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Restore />}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Notifications */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SectionTitle icon={<Notifications />}>Notifications</SectionTitle>

              <List dense disablePadding>
                <ToggleRow
                  primary="Email Notifications"
                  secondary="Receive updates and alerts via email"
                  checked={notifications.email}
                  onChange={(v) => handleNotificationChange('email', v)}
                />
                <ToggleRow
                  primary="SMS Notifications"
                  secondary="Receive important alerts via SMS"
                  checked={notifications.sms}
                  onChange={(v) => handleNotificationChange('sms', v)}
                />
                <ToggleRow
                  primary="Push Notifications"
                  secondary="Receive real-time notifications in the app"
                  checked={notifications.push}
                  onChange={(v) => handleNotificationChange('push', v)}
                />

                <Divider sx={{ my: 1 }} />

                <ToggleRow
                  primary="Price Alerts"
                  secondary="Get notified when stocks reach target prices"
                  checked={notifications.priceAlerts}
                  onChange={(v) => handleNotificationChange('priceAlerts', v)}
                />
                <ToggleRow
                  primary="News Alerts"
                  secondary="Receive breaking news and market updates"
                  checked={notifications.newsAlerts}
                  onChange={(v) => handleNotificationChange('newsAlerts', v)}
                />
                <ToggleRow
                  primary="Portfolio Updates"
                  secondary="Daily/weekly portfolio performance summaries"
                  checked={notifications.portfolioUpdates}
                  onChange={(v) => handleNotificationChange('portfolioUpdates', v)}
                />
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Trading preferences + appearance */}
        <Grid item xs={12} lg={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, height: '100%' }}>
            <Card>
              <CardContent>
                <SectionTitle icon={<Language />}>Trading Preferences</SectionTitle>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="settings-market">Default Market</InputLabel>
                      <Select
                        labelId="settings-market"
                        label="Default Market"
                        value={preferences.defaultMarket}
                        onChange={(e) => handlePreferenceChange('defaultMarket', e.target.value)}
                      >
                        <MenuItem value="indian">Indian Market</MenuItem>
                        <MenuItem value="us">US Market</MenuItem>
                        <MenuItem value="both">Both Markets</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="settings-currency">Currency</InputLabel>
                      <Select
                        labelId="settings-currency"
                        label="Currency"
                        value={preferences.currency}
                        onChange={(e) => handlePreferenceChange('currency', e.target.value)}
                      >
                        <MenuItem value="INR">Indian Rupee (₹)</MenuItem>
                        <MenuItem value="USD">US Dollar ($)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="settings-timezone">Timezone</InputLabel>
                      <Select
                        labelId="settings-timezone"
                        label="Timezone"
                        value={preferences.timezone}
                        onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                      >
                        <MenuItem value="Asia/Kolkata">Asia/Kolkata (IST)</MenuItem>
                        <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                        <MenuItem value="Europe/London">Europe/London (GMT)</MenuItem>
                        <MenuItem value="Asia/Tokyo">Asia/Tokyo (JST)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="settings-risk">Risk Profile</InputLabel>
                      <Select
                        labelId="settings-risk"
                        label="Risk Profile"
                        value={preferences.riskProfile}
                        onChange={(e) => handlePreferenceChange('riskProfile', e.target.value)}
                      >
                        <MenuItem value="conservative">Conservative</MenuItem>
                        <MenuItem value="moderate">Moderate</MenuItem>
                        <MenuItem value="aggressive">Aggressive</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
              <CardContent>
                <SectionTitle icon={<Palette />}>Appearance</SectionTitle>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="settings-theme">Theme</InputLabel>
                      <Select
                        labelId="settings-theme"
                        label="Theme"
                        value={colorPreference}
                        onChange={(e) => setColorPreference(e.target.value as ColorModePreference)}
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                        <MenuItem value="system">Match system</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="settings-language">Language</InputLabel>
                      <Select
                        labelId="settings-language"
                        label="Language"
                        value={preferences.language}
                        onChange={(e) => handlePreferenceChange('language', e.target.value)}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="hi">हिंदी (Hindi)</MenuItem>
                        <MenuItem value="gu">ગુજરાતી (Gujarati)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Privacy & Security */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SectionTitle icon={<Security />}>Privacy &amp; Security</SectionTitle>

              <Alert severity="info" sx={{ mb: 2 }}>
                Your data security is our priority. Control how your information is used.
              </Alert>

              <List dense disablePadding>
                <ToggleRow
                  primary="Share Usage Data"
                  secondary="Help us improve the app by sharing anonymous usage data"
                  checked={privacy.shareData}
                  onChange={(v) => handlePrivacyChange('shareData', v)}
                />
                <ToggleRow
                  primary="Analytics & Tracking"
                  secondary="Allow us to analyze app usage patterns to provide better features"
                  checked={privacy.analytics}
                  onChange={(v) => handlePrivacyChange('analytics', v)}
                />
                <ToggleRow
                  primary="Marketing Communications"
                  secondary="Receive promotional offers and product updates"
                  checked={privacy.marketing}
                  onChange={(v) => handlePrivacyChange('marketing', v)}
                />
              </List>

              <Box mt={3}>
                <Button variant="outlined" color="error">
                  Delete Account
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* About */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SectionTitle icon={<Info />}>About</SectionTitle>

              <Box display="flex" flexDirection="column" gap={2}>
                <InfoRow label="App Version">
                  <Chip label="1.0.0" size="small" />
                </InfoRow>

                <InfoRow label="Last Updated">
                  <Typography variant="body2" sx={{ color: 'var(--fh-text)' }}>January 8, 2024</Typography>
                </InfoRow>

                <InfoRow label="API Status">
                  <Chip label="Connected" color="success" size="small" />
                </InfoRow>

                <Divider />

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Connected Services
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    <Chip label="Alpha Vantage" size="small" variant="outlined" />
                    <Chip label="Finnhub" size="small" variant="outlined" />
                    <Chip label="OpenAI" size="small" variant="outlined" />
                    <Chip label="Kite Connect" size="small" variant="outlined" />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
