import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send,
  Close,
  SmartToy,
  Person,
  TrendingUp,
  AccountBalance,
  Rocket,
  Lightbulb,
  Shield,
  Assessment,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ChatbotProps {
  open: boolean;
  onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your financial assistant. I can help you with stock analysis, portfolio insights, IPO evaluations, and investment guidance. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActionsData: QuickAction[] = [
    {
      id: 'portfolio_analysis',
      title: 'Analyze Portfolio',
      description: 'Get insights about your portfolio',
      icon: <AccountBalance />,
    },
    {
      id: 'market_overview',
      title: 'Market Overview',
      description: 'Latest market trends',
      icon: <TrendingUp />,
    },
    {
      id: 'stock_recommendations',
      title: 'Stock Ideas',
      description: 'Discover opportunities',
      icon: <Lightbulb />,
    },
    {
      id: 'ipo_analysis',
      title: 'IPO Analysis',
      description: 'Review upcoming IPOs',
      icon: <Rocket />,
    },
    {
      id: 'risk_assessment',
      title: 'Risk Assessment',
      description: 'Understand your risk profile',
      icon: <Shield />,
    },
    {
      id: 'performance',
      title: 'Performance',
      description: 'Analyze performance metrics',
      icon: <Assessment />,
    },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      fetchQuickActions();
    }
  }, [open]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchQuickActions = async () => {
    try {
      const response = await axios.get('/api/chatbot/quick-actions');
      setQuickActions(response.data.actions);
    } catch (error) {
      console.error('Error fetching quick actions:', error);
      setQuickActions(quickActionsData);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chatbot/chat', {
        message: inputValue,
        context: {
          portfolio: {
            totalValue: 100000,
            totalReturnsPercentage: 12.5,
            holdings: 15,
          },
          market: user?.preferences?.defaultMarket || 'indian',
        },
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get response from chatbot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (actionId: string) => {
    const action = quickActions.find(a => a.id === actionId);
    if (!action) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: action.title,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chatbot/quick-action', {
        actionId,
        context: {
          portfolio: {
            totalValue: 100000,
            totalReturnsPercentage: 12.5,
            holdings: 15,
          },
          market: user?.preferences?.defaultMarket || 'indian',
        },
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Error handling quick action:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I\'m having trouble processing that action right now. Please try again later.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            // Full-screen sheet on phones, fixed-width side panel from sm up.
            width: { xs: '100%', sm: 400 },
            maxWidth: '100vw',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#0b1120',
            backgroundImage: 'none',
            borderLeft: { xs: 'none', sm: '1px solid rgba(148,163,184,0.12)' },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(6,182,212,0.75) 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <SmartToy sx={{ flexShrink: 0 }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 600, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
              Financial Assistant
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close assistant" sx={{ color: 'inherit', flexShrink: 0 }}>
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              p: { xs: 1.5, sm: 2 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 1,
                }}
              >
                {message.sender === 'bot' && (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: 'primary.main',
                      fontSize: '0.875rem',
                      flexShrink: 0,
                    }}
                  >
                    <SmartToy fontSize="small" />
                  </Avatar>
                )}
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.5,
                    maxWidth: { xs: '80%', sm: '75%' },
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    backgroundImage: 'none',
                    border: message.sender === 'user' ? 'none' : '1px solid rgba(99,102,241,0.2)',
                    backgroundColor:
                      message.sender === 'user'
                        ? 'primary.main'
                        : alpha(theme.palette.primary.main, 0.1),
                    color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.text}
                  </Typography>
                </Paper>
                {message.sender === 'user' && (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: 'secondary.main',
                      fontSize: '0.875rem',
                      flexShrink: 0,
                    }}
                  >
                    <Person fontSize="small" />
                  </Avatar>
                )}
              </Box>
            ))}
            
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', flexShrink: 0 }}>
                  <SmartToy fontSize="small" />
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.5,
                    backgroundImage: 'none',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '18px 18px 18px 4px',
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'var(--fh-text-3)' }}>
                    Thinking...
                  </Typography>
                </Paper>
              </Box>
            )}
            
            <div ref={messagesEndRef} />
          </Box>

          {quickActions.length > 0 && messages.length === 1 && (
            <Box sx={{ p: { xs: 1.5, sm: 2 }, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'var(--fh-text-3)' }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {quickActions.slice(0, 4).map((action) => (
                  <Chip
                    key={action.id}
                    icon={<span>{action.icon}</span>}
                    label={action.title}
                    variant="outlined"
                    size="small"
                    clickable
                    onClick={() => handleQuickAction(action.id)}
                    sx={{
                      maxWidth: '100%',
                      '& .MuiChip-icon': { display: 'flex', '& svg': { fontSize: 16 } },
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              pb: { xs: 'calc(12px + env(safe-area-inset-bottom))', sm: 2 },
              borderTop: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Ask me anything about your investments..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                variant="outlined"
                size="small"
              />
              <IconButton
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                color="primary"
                aria-label="Send message"
                sx={{ p: 1, flexShrink: 0 }}
              >
                <Send />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Chatbot;
