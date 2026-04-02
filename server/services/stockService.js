const axios = require('axios');
const Stock = require('../models/Stock');

class StockService {
  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.finnhubKey = process.env.FINNHUB_API_KEY;
    this.yahooFinanceApiKey = process.env.YAHOO_FINANCE_API_KEY;
  }

  async getStockQuote(symbol, market = 'US') {
    try {
      if (market === 'US') {
        return await this.getUSStockQuote(symbol);
      } else if (market === 'IN') {
        return await this.getIndianStockQuote(symbol);
      }
      throw new Error('Unsupported market');
    } catch (error) {
      console.error(`Error fetching stock quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getUSStockQuote(symbol) {
    try {
      const response = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubKey}`
      );

      const profileResponse = await axios.get(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${this.finnhubKey}`
      );

      const quote = response.data;
      const profile = profileResponse.data;

      const stockData = {
        symbol: symbol.toUpperCase(),
        name: profile.name || symbol,
        exchange: profile.exchange || 'NASDAQ',
        country: 'US',
        currency: 'USD',
        currentPrice: quote.c || 0,
        previousClose: quote.pc || 0,
        change: quote.d || 0,
        changePercent: quote.dp || 0,
        dayHigh: quote.h || 0,
        dayLow: quote.l || 0,
        marketCap: profile.marketCapitalization || 0,
        sector: profile.gics || '',
        industry: profile.subIndustry || '',
        description: profile.description || '',
        website: profile.weburl || '',
        employees: profile.employeeTotal || 0,
        logo: profile.logo || ''
      };

      await this.updateStockInDB(stockData);
      return stockData;
    } catch (error) {
      console.error(`Error fetching US stock quote:`, error);
      throw error;
    }
  }

  async getIndianStockQuote(symbol) {
    try {
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`
      );

      const data = response.data.chart.result[0];
      const meta = data.meta;
      const currentPrice = data.indicators.quote[0].close[data.indicators.quote[0].close.length - 1];

      const stockData = {
        symbol: symbol.toUpperCase(),
        name: meta.symbol,
        exchange: 'NSE',
        country: 'IN',
        currency: 'INR',
        currentPrice: currentPrice || 0,
        previousClose: meta.previousClose || 0,
        change: currentPrice - meta.previousClose || 0,
        changePercent: ((currentPrice - meta.previousClose) / meta.previousClose) * 100 || 0,
        dayHigh: meta.regularMarketDayHigh || 0,
        dayLow: meta.regularMarketDayLow || 0,
        volume: meta.regularMarketVolume || 0,
        marketCap: meta.marketCap || 0
      };

      await this.updateStockInDB(stockData);
      return stockData;
    } catch (error) {
      console.error(`Error fetching Indian stock quote:`, error);
      throw error;
    }
  }

  async getHistoricalData(symbol, period = '1M', market = 'US') {
    try {
      let url;
      if (market === 'US') {
        url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${this.getStartDate(period)}&to=${Math.floor(Date.now() / 1000)}&token=${this.finnhubKey}`;
      } else {
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?period1=${this.getStartDate(period)}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;
      }

      const response = await axios.get(url);
      
      if (market === 'US') {
        const data = response.data;
        return {
          dates: data.t.map(timestamp => new Date(timestamp * 1000)),
          prices: data.c,
          volumes: data.v,
          highs: data.h,
          lows: data.l,
          opens: data.o
        };
      } else {
        const data = response.data.chart.result[0];
        return {
          dates: data.timestamp.map(timestamp => new Date(timestamp * 1000)),
          prices: data.indicators.quote[0].close,
          volumes: data.indicators.quote[0].volume,
          highs: data.indicators.quote[0].high,
          lows: data.indicators.quote[0].low,
          opens: data.indicators.quote[0].open
        };
      }
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  async searchStocks(query, market = 'US') {
    try {
      let url;
      if (market === 'US') {
        url = `https://finnhub.io/api/v1/search?q=${query}&token=${this.finnhubKey}`;
      } else {
        url = `https://query1.finance.yahoo.com/v1/finance/search?q=${query}`;
      }

      const response = await axios.get(url);
      
      if (market === 'US') {
        return response.data.result.map(item => ({
          symbol: item.symbol,
          name: item.description,
          type: item.type,
          exchange: item.primary_exchange
        }));
      } else {
        return response.data.quotes.map(item => ({
          symbol: item.symbol,
          name: item.longname || item.shortname,
          exchange: item.exchange,
          type: item.quoteType
        }));
      }
    } catch (error) {
      console.error(`Error searching stocks:`, error);
      throw error;
    }
  }

  async getMarketMovers(market = 'US', type = 'gainers') {
    try {
      if (market === 'US') {
        const response = await axios.get(
          `https://finnhub.io/api/v1/stock/movers?direction=${type}&exchange=US&token=${this.finnhubKey}`
        );
        return response.data;
      } else {
        const gainers = await this.getIndianMarketMovers('gainers');
        const losers = await this.getIndianMarketMovers('losers');
        return type === 'gainers' ? gainers : losers;
      }
    } catch (error) {
      console.error(`Error fetching market movers:`, error);
      throw error;
    }
  }

  async getIndianMarketMovers(type) {
    try {
      const symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS'];
      const movers = [];

      for (const symbol of symbols) {
        try {
          const quote = await this.getIndianStockQuote(symbol);
          if (type === 'gainers' && quote.changePercent > 0) {
            movers.push(quote);
          } else if (type === 'losers' && quote.changePercent < 0) {
            movers.push(quote);
          }
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
        }
      }

      return movers.sort((a, b) => 
        type === 'gainers' ? b.changePercent - a.changePercent : a.changePercent - b.changePercent
      ).slice(0, 10);
    } catch (error) {
      console.error(`Error fetching Indian market movers:`, error);
      throw error;
    }
  }

  async updateStockInDB(stockData) {
    try {
      await Stock.findOneAndUpdate(
        { symbol: stockData.symbol, exchange: stockData.exchange },
        stockData,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error(`Error updating stock in DB:`, error);
    }
  }

  getStartDate(period) {
    const now = Math.floor(Date.now() / 1000);
    const periods = {
      '1D': 86400,
      '1W': 604800,
      '1M': 2592000,
      '3M': 7776000,
      '6M': 15552000,
      '1Y': 31536000,
      '2Y': 63072000,
      '5Y': 157680000
    };
    return now - (periods[period] || 2592000);
  }

  async getStockNews(symbol, market = 'US') {
    try {
      if (market === 'US') {
        const response = await axios.get(
          `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${this.getDateString(-7)}&to=${this.getDateString(0)}&token=${this.finnhubKey}`
        );
        return response.data.slice(0, 10).map(article => ({
          title: article.headline,
          url: article.url,
          source: article.source,
          publishedAt: new Date(article.datetime * 1000),
          summary: article.summary
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error fetching stock news:`, error);
      return [];
    }
  }

  getDateString(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() + daysAgo);
    return date.toISOString().split('T')[0];
  }
}

module.exports = new StockService();
