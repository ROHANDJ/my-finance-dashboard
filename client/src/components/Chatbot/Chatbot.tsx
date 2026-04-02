import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Paper,
  Chip,
  Avatar,
  Fab,
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
            width: 400,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Financial Assistant
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
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
                    }}
                  >
                    <SmartToy fontSize="small" />
                  </Avatar>
                )}
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
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
                    }}
                  >
                    <Person fontSize="small" />
                  </Avatar>
                )}
              </Box>
            ))}
            
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <SmartToy fontSize="small" />
                </Avatar>
                <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    Thinking...
                  </Typography>
                </Paper>
              </Box>
            )}
            
            <div ref={messagesEndRef} />
          </Box>

          {quickActions.length > 0 && messages.length === 1 && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
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

          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
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
                sx={{ p: 1 }}
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
