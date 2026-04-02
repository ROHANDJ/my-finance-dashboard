const express = require('express');
const OpenAI = require('openai');
const auth = require('../middleware/auth');
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ChatbotService {
  constructor() {
    this.systemPrompt = `You are an intelligent financial assistant for a stock market and portfolio analysis application. Your expertise includes:

1. Stock market analysis (US and Indian markets)
2. Portfolio management and optimization
3. Mutual funds analysis
4. IPO evaluation and recommendations
5. Technical analysis and chart patterns
6. Fundamental analysis
7. Risk management
8. Investment strategies

Key guidelines:
- Always provide balanced, educational information
- Never give direct financial advice or guarantee returns
- Include risk warnings for investment recommendations
- Use clear, simple language
- Provide data-backed insights when possible
- Ask clarifying questions when needed
- Be helpful and conversational
- Focus on education and analysis rather than predictions

You have access to real-time market data, portfolio information, and can help users:
- Analyze stocks and portfolios
- Compare mutual funds
- Evaluate IPOs
- Understand market trends
- Learn about investment concepts
- Navigate the application features

Always be professional, accurate, and user-friendly like the Groww app interface.`;
  }

  async getResponse(userMessage, userId, context = {}) {
    try {
      const messages = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: this.formatUserMessage(userMessage, context) }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      return 'I apologize, but I\'m having trouble processing your request right now. Please try again later.';
    }
  }

  formatUserMessage(message, context) {
    let formattedMessage = message;

    if (context.portfolio) {
      formattedMessage += `\n\nPortfolio Context:\n- Total Value: $${context.portfolio.totalValue?.toLocaleString()}\n- Total Returns: ${context.portfolio.totalReturnsPercentage?.toFixed(2)}%\n- Holdings: ${context.portfolio.holdings?.length || 0} stocks`;
    }

    if (context.market) {
      formattedMessage += `\n\nMarket Context: Currently viewing ${context.market} market`;
    }

    if (context.currentStock) {
      formattedMessage += `\n\nCurrent Stock: ${context.currentStock.symbol} - ${context.currentStock.name}`;
    }

    return formattedMessage;
  }

  async getQuickActions(userId) {
    return [
      {
        id: 'portfolio_analysis',
        title: 'Analyze My Portfolio',
        description: 'Get insights about your portfolio performance and allocation',
        icon: 'chart-line'
      },
      {
        id: 'market_overview',
        title: 'Market Overview',
        description: 'Get latest market trends and indices',
        icon: 'trending-up'
      },
      {
        id: 'stock_recommendations',
        title: 'Stock Ideas',
        description: 'Discover potential investment opportunities',
        icon: 'lightbulb'
      },
      {
        id: 'ipo_analysis',
        title: 'IPO Analysis',
        description: 'Review upcoming and recent IPOs',
        icon: 'rocket'
      },
      {
        id: 'mutual_funds',
        title: 'Mutual Fund Help',
        description: 'Learn about and compare mutual funds',
        icon: 'piggy-bank'
      },
      {
        id: 'risk_assessment',
        title: 'Risk Assessment',
        description: 'Understand your risk profile and strategies',
        icon: 'shield'
      }
    ];
  }

  async handleQuickAction(actionId, userId, context) {
    const actions = {
      portfolio_analysis: 'Can you analyze my portfolio performance and provide insights on my current holdings and allocation?',
      market_overview: 'What\'s happening in the market today? Show me the latest trends and important market movements.',
      stock_recommendations: 'Can you suggest some interesting stocks to research? Please focus on companies with strong fundamentals.',
      ipo_analysis: 'What are the most interesting IPOs coming up? Help me understand which ones might be worth watching.',
      mutual_funds: 'I want to learn about mutual funds. Can you explain different types and how to choose good ones?',
      risk_assessment: 'Help me understand my risk tolerance and suggest appropriate investment strategies.'
    };

    const message = actions[actionId];
    if (message) {
      return await this.getResponse(message, userId, context);
    }

    return 'I\'m not sure how to help with that action. Please try asking me a question directly.';
  }

  async getStockInsights(symbol, marketData) {
    const prompt = `Analyze the following stock and provide insights:

Stock: ${symbol}
Current Price: $${marketData.currentPrice}
Change: ${marketData.changePercent}%
Market Cap: $${marketData.marketCap?.toLocaleString()}
Sector: ${marketData.sector}

Please provide:
1. Technical analysis summary
2. Key factors to watch
3. Risk considerations
4. Questions investors should ask
5. Next steps for research`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error getting stock insights:', error);
      return 'I apologize, but I\'m having trouble analyzing this stock right now. Please try again later.';
    }
  }

  async getPortfolioInsights(portfolioData) {
    const prompt = `Analyze this portfolio and provide comprehensive insights:

Portfolio Summary:
- Total Value: $${portfolioData.totalValue?.toLocaleString()}
- Total Returns: ${portfolioData.totalReturnsPercentage?.toFixed(2)}%
- Number of Holdings: ${portfolioData.holdings?.length || 0}

Top Holdings:
${portfolioData.holdings?.slice(0, 5).map(h => `- ${h.symbol}: ${h.quantity} shares (${((h.quantity * h.currentPrice) / portfolioData.totalValue * 100).toFixed(2)}%)`).join('\n') || 'No holdings'}

Allocation:
${Object.entries(portfolioData.allocation || {}).map(([key, value]) => `- ${key}: ${value.toFixed(2)}%`).join('\n') || 'No allocation data'}

Please provide:
1. Portfolio health assessment
2. Diversification analysis
3. Risk evaluation
4. Optimization suggestions
5. Rebalancing recommendations`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 700,
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error getting portfolio insights:', error);
      return 'I apologize, but I\'m having trouble analyzing your portfolio right now. Please try again later.';
    }
  }

  async getIPOInsights(ipoData) {
    const prompt = `Analyze this IPO and provide investment insights:

IPO Details:
- Company: ${ipoData.companyName}
- Symbol: ${ipoData.symbol}
- Price Range: $${ipoData.offering?.priceRange?.min} - $${ipoData.offering?.priceRange?.max}
- Total Issue Size: $${ipoData.offering?.totalAmount?.toLocaleString()}
- Market: ${ipoData.country}

Key Information:
${ipoData.details?.description || 'No description available'}

Please provide:
1. IPO quality assessment
2. Investment considerations
3. Risk factors
4. Market timing analysis
5. Alternative suggestions`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error getting IPO insights:', error);
      return 'I apologize, but I\'m having trouble analyzing this IPO right now. Please try again later.';
    }
  }
}

const chatbotService = new ChatbotService();

router.post('/chat', auth, async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const response = await chatbotService.getResponse(message, req.userId, context);
    
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ message: 'Error processing chat message' });
  }
});

router.get('/quick-actions', auth, async (req, res) => {
  try {
    const actions = await chatbotService.getQuickActions(req.userId);
    res.json({ actions });
  } catch (error) {
    console.error('Error fetching quick actions:', error);
    res.status(500).json({ message: 'Error fetching quick actions' });
  }
});

router.post('/quick-action', auth, async (req, res) => {
  try {
    const { actionId, context = {} } = req.body;

    if (!actionId) {
      return res.status(400).json({ message: 'Action ID is required' });
    }

    const response = await chatbotService.handleQuickAction(actionId, req.userId, context);
    
    res.json({ response });
  } catch (error) {
    console.error('Error handling quick action:', error);
    res.status(500).json({ message: 'Error handling quick action' });
  }
});

router.post('/stock-insights', auth, async (req, res) => {
  try {
    const { symbol, marketData } = req.body;

    if (!symbol || !marketData) {
      return res.status(400).json({ message: 'Symbol and market data are required' });
    }

    const insights = await chatbotService.getStockInsights(symbol, marketData);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error getting stock insights:', error);
    res.status(500).json({ message: 'Error getting stock insights' });
  }
});

router.post('/portfolio-insights', auth, async (req, res) => {
  try {
    const { portfolioData } = req.body;

    if (!portfolioData) {
      return res.status(400).json({ message: 'Portfolio data is required' });
    }

    const insights = await chatbotService.getPortfolioInsights(portfolioData);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error getting portfolio insights:', error);
    res.status(500).json({ message: 'Error getting portfolio insights' });
  }
});

router.post('/ipo-insights', auth, async (req, res) => {
  try {
    const { ipoData } = req.body;

    if (!ipoData) {
      return res.status(400).json({ message: 'IPO data is required' });
    }

    const insights = await chatbotService.getIPOInsights(ipoData);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error getting IPO insights:', error);
    res.status(500).json({ message: 'Error getting IPO insights' });
  }
});

module.exports = router;
