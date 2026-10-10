import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  TrendingUp,
  AccountBalance,
  ShowChart,
  Rocket,
  SwapHoriz,
  Person,
  Settings,
  Logout,
  Notifications,
  Chat,
  Receipt,
  CreditCard,
  Summarize,
  AutoGraph,
  UploadFile,
  Explore,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useColorMode } from '../../contexts/ColorModeContext';
import Chatbot from '../Chatbot/Chatbot';
import MarketTicker from '../MarketTicker/MarketTicker';
import OnboardingTour from '../Tour/OnboardingTour';

const drawerWidth = 264;

const menuItems = [
  { text: 'Dashboard',   icon: <Dashboard />,     path: '/dashboard',    group: 'main' },
  { text: 'EOD Summary', icon: <Summarize />,      path: '/eod-dashboard',group: 'main' },
  { text: 'Portfolio',   icon: <AccountBalance />, path: '/portfolio',    group: 'invest' },
  { text: 'Import CAS',  icon: <UploadFile />,     path: '/cas-upload',   group: 'invest' },
  { text: 'Optimization',icon: <AutoGraph />,      path: '/optimization', group: 'invest' },
  { text: 'Stocks',      icon: <TrendingUp />,     path: '/stocks',       group: 'invest' },
  { text: 'Mutual Funds',icon: <ShowChart />,      path: '/mutual-funds', group: 'invest' },
  { text: 'IPO',         icon: <Rocket />,         path: '/ipo',          group: 'invest' },
  { text: 'Trading',     icon: <SwapHoriz />,      path: '/trading',      group: 'invest' },
  { text: 'Expenses',    icon: <Receipt />,        path: '/expenses',     group: 'finance' },
  { text: 'Credit Cards',icon: <CreditCard />,     path: '/credit-cards', group: 'finance' },
];

const groupLabels: Record<string, string> = {
  main:    'OVERVIEW',
  invest:  'INVESTMENTS',
  finance: 'PERSONAL FINANCE',
};

// accent colors per group
const groupAccent: Record<string, string> = {
  main:    'var(--fh-info)',
  invest:  'var(--fh-indigo)',
  finance: 'var(--fh-up)',
};

interface LayoutProps { children: React.ReactNode; }

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [anchorEl, setAnchorEl]       = useState<null | HTMLElement>(null);
  const [showChatbot, setShowChatbot] = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout, completeOnboarding } = useAuth();
  const [tourOpen, setTourOpen] = useState(false);
  const { mode: colorMode, toggle: toggleColorMode } = useColorMode();

  // First login: show the tour exactly once per account. It's marked as seen
  // the moment it appears (not when closed), so logging out, refreshing or
  // navigating away mid-tour doesn't bring it back next time. The flag is
  // saved to the profile (all devices) and localStorage (in case that fails).
  const autoTourShownRef = useRef(false);
  useEffect(() => {
    if (!user || user.preferences?.onboardingCompleted || autoTourShownRef.current) return;
    let seenLocally = false;
    try { seenLocally = localStorage.getItem(`tour_done_${user.id}`) === '1'; } catch {}
    if (seenLocally) return;
    const t = setTimeout(() => {
      autoTourShownRef.current = true;
      setTourOpen(true);
      try { localStorage.setItem(`tour_done_${user.id}`, '1'); } catch {}
      completeOnboarding();
    }, 700);
    return () => clearTimeout(t);
  }, [user, completeOnboarding]);

  const handleTourClose = () => setTourOpen(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setAnchorEl(null);
    navigate('/login');
  };

  const renderGroup = (group: string) => {
    const items  = menuItems.filter(i => i.group === group);
    const accent = groupAccent[group];
    return (
      <Box key={group} data-tour={`nav-${group}`} sx={{ mb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 0.5,
            display: 'block',
            color: accent,
            fontWeight: 800,
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            opacity: 0.7,
          }}
        >
          {groupLabels[group]}
        </Typography>
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <Box
              key={item.text}
              onClick={() => handleMenuClick(item.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 1,
                mx: 1,
                mb: 0.5,
                borderRadius: '10px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                background: active
                  ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 13%, transparent) 0%, color-mix(in srgb, ${accent} 7%, transparent) 100%)`
                  : 'transparent',
                border: active
                  ? `1px solid color-mix(in srgb, ${accent} 27%, transparent)`
                  : '1px solid transparent',
                color: active ? accent : 'var(--fh-text-3)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: active
                    ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 16%, transparent) 0%, color-mix(in srgb, ${accent} 8%, transparent) 100%)`
                    : 'rgba(99, 102, 241, 0.06)',
                  color: active ? accent : 'var(--fh-text)',
                  border: `1px solid ${active ? `color-mix(in srgb, ${accent} 38%, transparent)` : 'rgba(99,102,241,0.2)'}`,
                },
                '&::before': active ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '20%',
                  bottom: '20%',
                  width: '3px',
                  background: accent,
                  borderRadius: '0 3px 3px 0',
                  boxShadow: `0 0 8px ${accent}`,
                } : {},
              }}
            >
              <Box
                sx={{
                  mr: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  color: active ? accent : 'inherit',
                  '& svg': { fontSize: '1.1rem' },
                  filter: active ? `drop-shadow(0 0 6px ${accent})` : 'none',
                }}
              >
                {item.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: active ? 700 : 500,
                  letterSpacing: active ? '0.01em' : 0,
                  textShadow: active ? `0 0 12px color-mix(in srgb, ${accent} 40%, transparent)` : 'none',
                }}
              >
                {item.text}
              </Typography>
            </Box>
          );
        })}
        <Box sx={{ mx: 2, my: 1, height: '1px', background: 'rgba(148, 163, 184, 0.06)' }} />
      </Box>
    );
  };

  const extraTitles: Record<string, string> = { '/profile': 'Profile', '/settings': 'Settings' };
  const currentPageName = menuItems.find(i => i.path === location.pathname)?.text || extraTitles[location.pathname] || 'Dashboard';

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--fh-sidebar)',
        borderRight: '1px solid rgba(99, 102, 241, 0.12)',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, var(--fh-info) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.5)',
            flexShrink: 0,
          }}
        >
          <ShowChart sx={{ color: '#fff', fontSize: '1.1rem' }} />
        </Box>
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, var(--fh-indigo), var(--fh-info))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.2,
            }}
          >
            FinanceHub
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
            <Box className="pulse-dot" sx={{ width: 6, height: 6 }} />
            <Typography sx={{ fontSize: '0.62rem', color: 'var(--fh-up)', fontWeight: 600 }}>
              LIVE
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5 }}>
        {['main', 'invest', 'finance'].map(renderGroup)}
      </Box>

      {/* User section */}
      <Box
        sx={{
          px: 2,
          py: 2,
          borderTop: '1px solid rgba(99, 102, 241, 0.1)',
          background: 'var(--fh-surface-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          '&:hover': { background: 'rgba(99, 102, 241, 0.06)' },
        }}
        onClick={() => navigate('/profile')}
      >
        <Avatar
          sx={{
            width: 34,
            height: 34,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            fontSize: '0.85rem',
            fontWeight: 700,
            boxShadow: '0 2px 12px rgba(99, 102, 241, 0.4)',
          }}
        >
          {user?.firstName?.charAt(0) || 'U'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fh-text)' }}>
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: 'var(--fh-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email || ''}
          </Typography>
        </Box>
        <Settings sx={{ fontSize: '0.9rem', color: 'var(--fh-muted-2)' }} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: 'var(--fh-appbar)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }}>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: 'var(--fh-text-3)' }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 110 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--fh-text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}
            >
              {currentPageName}
            </Typography>
          </Box>

          {/* Live market ticker — hidden on small screens */}
          <Box data-tour="market-ticker" sx={{ display: { xs: 'none', lg: 'flex' }, flex: 1, overflow: 'hidden' }}>
            <MarketTicker />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto', pl: 1 }}>
            <Tooltip title={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton
                onClick={toggleColorMode}
                aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                sx={{ color: 'var(--fh-muted)', '&:hover': { color: '#6366f1', background: 'rgba(99,102,241,0.1)' } }}
              >
                {colorMode === 'dark' ? <LightMode sx={{ fontSize: '1.2rem' }} /> : <DarkMode sx={{ fontSize: '1.2rem' }} />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton sx={{ color: 'var(--fh-muted)', '&:hover': { color: '#6366f1', background: 'rgba(99,102,241,0.1)' } }}>
                <Badge
                  badgeContent={0}
                  color="error"
                  sx={{ '& .MuiBadge-badge': { background: 'var(--fh-down)', fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                >
                  <Notifications sx={{ fontSize: '1.2rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="AI Assistant">
              <IconButton
                data-tour="ai-assistant"
                onClick={() => setShowChatbot(!showChatbot)}
                sx={{
                  color: showChatbot ? '#6366f1' : 'var(--fh-muted)',
                  background: showChatbot ? 'rgba(99,102,241,0.15)' : 'transparent',
                  '&:hover': { color: '#6366f1', background: 'rgba(99,102,241,0.1)' },
                }}
              >
                <Chat sx={{ fontSize: '1.2rem' }} />
              </IconButton>
            </Tooltip>

            <IconButton
              data-tour="profile-menu"
              aria-label="Account menu"
              onClick={e => setAnchorEl(e.currentTarget)}
              sx={{ ml: 0.5, p: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 12px rgba(99, 102, 241, 0.5)',
                }}
              >
                {user?.firstName?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            onClick={() => setAnchorEl(null)}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 1,
                minWidth: 180,
                background: 'var(--fh-dialog)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 16px 48px var(--fh-shadow)',
                '& .MuiMenuItem-root': {
                  fontSize: '0.85rem',
                  py: 1,
                  '&:hover': { background: 'rgba(99,102,241,0.1)' },
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => navigate('/profile')}>
              <ListItemIcon><Person sx={{ fontSize: '1rem', color: '#6366f1' }} /></ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => navigate('/settings')}>
              <ListItemIcon><Settings sx={{ fontSize: '1rem', color: 'var(--fh-info)' }} /></ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { if (isMobile) setMobileOpen(false); setTourOpen(true); }}>
              <ListItemIcon><Explore sx={{ fontSize: '1rem', color: '#8b5cf6' }} /></ListItemIcon>
              <ListItemText>Take the tour</ListItemText>
            </MenuItem>
            <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)' }} />
            <MenuItem onClick={handleLogout} sx={{ color: 'var(--fh-down) !important' }}>
              <ListItemIcon><Logout sx={{ fontSize: '1rem', color: 'var(--fh-down)' }} /></ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              border: 'none',
              background: 'transparent',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: 'transparent',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }} />
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1800, mx: 'auto' }}>
          {children}
        </Box>
      </Box>

      <OnboardingTour open={tourOpen} onClose={handleTourClose} />

      {showChatbot && (
        <Chatbot open={showChatbot} onClose={() => setShowChatbot(false)} />
      )}
    </Box>
  );
};

export default Layout;
