import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Chatbot from '../Chatbot/Chatbot';
import MarketTicker from '../MarketTicker/MarketTicker';

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
  main:    '#06b6d4',
  invest:  '#6366f1',
  finance: '#10b981',
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
  const { user, logout } = useAuth();

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
      <Box key={group} sx={{ mb: 1 }}>
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
                  ? `linear-gradient(135deg, ${accent}22 0%, ${accent}11 100%)`
                  : 'transparent',
                border: active
                  ? `1px solid ${accent}44`
                  : '1px solid transparent',
                color: active ? accent : 'rgba(226, 232, 240, 0.65)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: active
                    ? `linear-gradient(135deg, ${accent}28 0%, ${accent}14 100%)`
                    : 'rgba(99, 102, 241, 0.06)',
                  color: active ? accent : '#e2e8f0',
                  border: `1px solid ${active ? accent + '60' : 'rgba(99,102,241,0.2)'}`,
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
                  textShadow: active ? `0 0 12px ${accent}66` : 'none',
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

  const currentPageName = menuItems.find(i => i.path === location.pathname)?.text || 'Dashboard';

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #070c1f 0%, #0b1128 60%, #07101e 100%)',
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
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
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
              background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
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
            <Typography sx={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 600 }}>
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
          background: 'rgba(6, 8, 24, 0.4)',
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
          <Typography noWrap sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email || ''}
          </Typography>
        </Box>
        <Settings sx={{ fontSize: '0.9rem', color: '#475569' }} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: 'rgba(6, 8, 24, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }}>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: '#94a3b8' }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 110 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}
            >
              {currentPageName}
            </Typography>
          </Box>

          {/* Live market ticker — hidden on small screens */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, flex: 1, overflow: 'hidden' }}>
            <MarketTicker />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Notifications">
              <IconButton sx={{ color: '#64748b', '&:hover': { color: '#6366f1', background: 'rgba(99,102,241,0.1)' } }}>
                <Badge
                  badgeContent={0}
                  color="error"
                  sx={{ '& .MuiBadge-badge': { background: '#f43f5e', fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                >
                  <Notifications sx={{ fontSize: '1.2rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="AI Assistant">
              <IconButton
                onClick={() => setShowChatbot(!showChatbot)}
                sx={{
                  color: showChatbot ? '#6366f1' : '#64748b',
                  background: showChatbot ? 'rgba(99,102,241,0.15)' : 'transparent',
                  '&:hover': { color: '#6366f1', background: 'rgba(99,102,241,0.1)' },
                }}
              >
                <Chat sx={{ fontSize: '1.2rem' }} />
              </IconButton>
            </Tooltip>

            <IconButton
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
                background: 'rgba(9, 15, 35, 0.98)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
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
              <ListItemIcon><Settings sx={{ fontSize: '1rem', color: '#06b6d4' }} /></ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)' }} />
            <MenuItem onClick={handleLogout} sx={{ color: '#f43f5e !important' }}>
              <ListItemIcon><Logout sx={{ fontSize: '1rem', color: '#f43f5e' }} /></ListItemIcon>
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
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: 'transparent',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }} />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>

      {showChatbot && (
        <Chatbot open={showChatbot} onClose={() => setShowChatbot(false)} />
      )}
    </Box>
  );
};

export default Layout;
