import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
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

const Settings: React.FC = () => {
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
    theme: 'light',
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
      theme: 'light',
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Settings
        </Typography>
        <Box display="flex" gap={2}>
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

      <Box display="flex" flexDirection="column" gap={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
              Notifications
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive updates and alerts via email"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.email}
                    onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="SMS Notifications"
                  secondary="Receive important alerts via SMS"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.sms}
                    onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Push Notifications"
                  secondary="Receive real-time notifications in the app"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.push}
                    onChange={(e) => handleNotificationChange('push', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemText
                  primary="Price Alerts"
                  secondary="Get notified when stocks reach target prices"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.priceAlerts}
                    onChange={(e) => handleNotificationChange('priceAlerts', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="News Alerts"
                  secondary="Receive breaking news and market updates"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.newsAlerts}
                    onChange={(e) => handleNotificationChange('newsAlerts', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Portfolio Updates"
                  secondary="Daily/weekly portfolio performance summaries"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.portfolioUpdates}
                    onChange={(e) => handleNotificationChange('portfolioUpdates', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              <Language sx={{ mr: 1, verticalAlign: 'middle' }} />
              Trading Preferences
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={3}>
              <FormControl fullWidth>
                <InputLabel>Default Market</InputLabel>
                <Select
                  value={preferences.defaultMarket}
                  onChange={(e) => handlePreferenceChange('defaultMarket', e.target.value)}
                >
                  <MenuItem value="indian">Indian Market</MenuItem>
                  <MenuItem value="us">US Market</MenuItem>
                  <MenuItem value="both">Both Markets</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={preferences.currency}
                  onChange={(e) => handlePreferenceChange('currency', e.target.value)}
                >
                  <MenuItem value="INR">Indian Rupee (₹)</MenuItem>
                  <MenuItem value="USD">US Dollar ($)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={preferences.timezone}
                  onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                >
                  <MenuItem value="Asia/Kolkata">Asia/Kolkata (IST)</MenuItem>
                  <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                  <MenuItem value="Europe/London">Europe/London (GMT)</MenuItem>
                  <MenuItem value="Asia/Tokyo">Asia/Tokyo (JST)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Risk Profile</InputLabel>
                <Select
                  value={preferences.riskProfile}
                  onChange={(e) => handlePreferenceChange('riskProfile', e.target.value)}
                >
                  <MenuItem value="conservative">Conservative</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                  <MenuItem value="aggressive">Aggressive</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
              Appearance
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={3}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={preferences.theme}
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="auto">Auto (System)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="hi">हिंदी (Hindi)</MenuItem>
                  <MenuItem value="gu">ગુજરાતી (Gujarati)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              Privacy & Security
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Your data security is our priority. Control how your information is used.
            </Alert>
            
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Share Usage Data"
                  secondary="Help us improve the app by sharing anonymous usage data"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={privacy.shareData}
                    onChange={(e) => handlePrivacyChange('shareData', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Analytics & Tracking"
                  secondary="Allow us to analyze app usage patterns to provide better features"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={privacy.analytics}
                    onChange={(e) => handlePrivacyChange('analytics', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Marketing Communications"
                  secondary="Receive promotional offers and product updates"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={privacy.marketing}
                    onChange={(e) => handlePrivacyChange('marketing', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
            
            <Box mt={3}>
              <Button variant="outlined" color="error">
                Delete Account
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              <Info sx={{ mr: 1, verticalAlign: 'middle' }} />
              About
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">App Version</Typography>
                <Chip label="1.0.0" size="small" />
              </Box>
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Last Updated</Typography>
                <Typography variant="body2">January 8, 2024</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">API Status</Typography>
                <Chip label="Connected" color="success" size="small" />
              </Box>
              
              <Divider />
              
              <Box>
                <Typography variant="body2" gutterBottom>
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
      </Box>
    </Box>
  );
};

export default Settings;
