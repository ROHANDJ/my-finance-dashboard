const express = require('express');
const IPO = require('../models/IPO');
const axios = require('axios');
const auth = require('../middleware/auth');
const router = express.Router();

class IPOService {
  constructor() {
    this.nseBaseUrl = 'https://www.nseindia.com';
    this.bseBaseUrl = 'https://www.bseindia.com';
  }

  async fetchIndianIPOs() {
    try {
      const ipos = [];
      
      const upcomingIPOs = await this.fetchUpcomingIPOs();
      const openIPOs = await this.fetchOpenIPOs();
      const listedIPOs = await this.fetchListedIPOs();

      ipos.push(...upcomingIPOs, ...openIPOs, ...listedIPOs);
      
      return ipos;
    } catch (error) {
      console.error('Error fetching Indian IPOs:', error);
      throw error;
    }
  }

  async fetchUpcomingIPOs() {
    try {
      const mockUpcomingIPOs = [
        {
          symbol: 'TECHIPO',
          companyName: 'Tech Innovators Ltd',
          exchange: 'NSE',
          country: 'IN',
          currency: 'INR',
          status: 'upcoming',
          timeline: {
            openDate: new Date('2024-02-15'),
            closeDate: new Date('2024-02-20'),
            listingDate: new Date('2024-02-28')
          },
          offering: {
            totalShares: 10000000,
            priceRange: { min: 850, max: 900 },
            totalAmount: 8750000000
          },
          details: {
            description: 'Leading technology solutions provider',
            industry: 'Information Technology',
            sector: 'Technology'
          }
        }
      ];

      return mockUpcomingIPOs;
    } catch (error) {
      console.error('Error fetching upcoming IPOs:', error);
      return [];
    }
  }

  async fetchOpenIPOs() {
    try {
      const mockOpenIPOs = [
        {
          symbol: 'HEALTHIPO',
          companyName: 'Healthcare Solutions Inc',
          exchange: 'NSE',
          country: 'IN',
          currency: 'INR',
          status: 'open',
          timeline: {
            openDate: new Date('2024-01-20'),
            closeDate: new Date('2024-01-25'),
            listingDate: new Date('2024-02-02')
          },
          offering: {
            totalShares: 5000000,
            priceRange: { min: 1200, max: 1250 },
            totalAmount: 6125000000
          },
          subscription: {
            retail: { subscribed: 2500000, total: 2000000, percentage: 125 },
            nii: { subscribed: 1500000, total: 1000000, percentage: 150 },
            qib: { subscribed: 2000000, total: 2000000, percentage: 100 }
          }
        }
      ];

      return mockOpenIPOs;
    } catch (error) {
      console.error('Error fetching open IPOs:', error);
      return [];
    }
  }

  async fetchListedIPOs() {
    try {
      const mockListedIPOs = [
        {
          symbol: 'FINTECHIPO',
          companyName: 'Fintech Solutions Ltd',
          exchange: 'NSE',
          country: 'IN',
          currency: 'INR',
          status: 'listed',
          timeline: {
            listingDate: new Date('2024-01-10')
          },
          offering: {
            finalPrice: 750,
            totalAmount: 5000000000
          },
          listing: {
            listingPrice: 825,
            listingGain: 75,
            listingGainPercentage: 10,
            currentPrice: 890,
            dayHigh: 910,
            dayLow: 820
          }
        }
      ];

      return mockListedIPOs;
    } catch (error) {
      console.error('Error fetching listed IPOs:', error);
      return [];
    }
  }

  async fetchUSIPOs() {
    try {
      const mockUSIPOs = [
        {
          symbol: 'USTECH',
          companyName: 'US Technology Corp',
          exchange: 'NASDAQ',
          country: 'US',
          currency: 'USD',
          status: 'upcoming',
          timeline: {
            openDate: new Date('2024-02-20'),
            closeDate: new Date('2024-02-22'),
            listingDate: new Date('2024-02-28')
          },
          offering: {
            totalShares: 5000000,
            priceRange: { min: 25, max: 28 },
            totalAmount: 132500000
          },
          details: {
            description: 'Innovative technology company',
            industry: 'Software',
            sector: 'Technology'
          }
        }
      ];

      return mockUSIPOs;
    } catch (error) {
      console.error('Error fetching US IPOs:', error);
      return [];
    }
  }

  async analyzeIPO(ipoData) {
    try {
      const analysis = {
        recommendation: 'neutral',
        rating: 3,
        pros: [],
        cons: [],
        keyHighlights: [],
        valuation: 'fair'
      };

      if (ipoData.offering.priceRange) {
        const avgPrice = (ipoData.offering.priceRange.min + ipoData.offering.priceRange.max) / 2;
        
        if (ipoData.financials && ipoData.financials.pe) {
          if (ipoData.financials.pe < 15) {
            analysis.recommendation = 'subscribe';
            analysis.rating = 4;
            analysis.pros.push('Reasonable PE ratio');
            analysis.valuation = 'undervalued';
          } else if (ipoData.financials.pe > 30) {
            analysis.recommendation = 'avoid';
            analysis.rating = 2;
            analysis.cons.push('High PE ratio');
            analysis.valuation = 'overvalued';
          }
        }
      }

      if (ipoData.financials && ipoData.financials.revenue) {
        const revenue = ipoData.financials.revenue;
        if (revenue.length >= 2) {
          const growthRate = ((revenue[1].amount - revenue[0].amount) / revenue[0].amount) * 100;
          if (growthRate > 20) {
            analysis.pros.push(`Strong revenue growth: ${growthRate.toFixed(1)}%`);
            analysis.keyHighlights.push(`Revenue growth: ${growthRate.toFixed(1)}%`);
          }
        }
      }

      if (ipoData.subscription && ipoData.subscription.retail.percentage > 100) {
        analysis.pros.push('Strong retail subscription');
        analysis.keyHighlights.push(`Retail subscription: ${ipoData.subscription.retail.percentage}%`);
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing IPO:', error);
      return {
        recommendation: 'neutral',
        rating: 3,
        pros: [],
        cons: [],
        keyHighlights: [],
        valuation: 'fair'
      };
    }
  }

  async updateIPODatabase() {
    try {
      const indianIPOs = await this.fetchIndianIPOs();
      const usIPOs = await this.fetchUSIPOs();
      
      const allIPOs = [...indianIPOs, ...usIPOs];

      for (const ipoData of allIPOs) {
        const analysis = await this.analyzeIPO(ipoData);
        
        await IPO.findOneAndUpdate(
          { symbol: ipoData.symbol, exchange: ipoData.exchange },
          { ...ipoData, analysis },
          { upsert: true, new: true }
        );
      }

      return allIPOs;
    } catch (error) {
      console.error('Error updating IPO database:', error);
      throw error;
    }
  }
}

const ipoService = new IPOService();

router.get('/', auth, async (req, res) => {
  try {
    const { market = 'both', status = 'all' } = req.query;
    
    let filter = {};
    if (market !== 'both') {
      filter.country = market === 'US' ? 'US' : 'IN';
    }
    if (status !== 'all') {
      filter.status = status;
    }

    const ipos = await IPO.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ ipos });
  } catch (error) {
    console.error('Error fetching IPOs:', error);
    res.status(500).json({ message: 'Error fetching IPOs' });
  }
});

router.get('/update', auth, async (req, res) => {
  try {
    const updatedIPOs = await ipoService.updateIPODatabase();
    res.json({ 
      message: 'IPO database updated successfully', 
      count: updatedIPOs.length 
    });
  } catch (error) {
    console.error('Error updating IPO database:', error);
    res.status(500).json({ message: 'Error updating IPO database' });
  }
});

router.get('/:symbol', auth, async (req, res) => {
  try {
    const ipo = await IPO.findOne({ 
      symbol: req.params.symbol.toUpperCase() 
    });

    if (!ipo) {
      return res.status(404).json({ message: 'IPO not found' });
    }

    res.json({ ipo });
  } catch (error) {
    console.error('Error fetching IPO details:', error);
    res.status(500).json({ message: 'Error fetching IPO details' });
  }
});

router.get('/calendar/upcoming', auth, async (req, res) => {
  try {
    const { market = 'both' } = req.query;
    
    let filter = { 
      status: 'upcoming',
      'timeline.openDate': { $gte: new Date() }
    };
    
    if (market !== 'both') {
      filter.country = market === 'US' ? 'US' : 'IN';
    }

    const upcomingIPOs = await IPO.find(filter)
      .sort({ 'timeline.openDate': 1 })
      .limit(20);

    res.json({ ipos: upcomingIPOs });
  } catch (error) {
    console.error('Error fetching upcoming IPOs:', error);
    res.status(500).json({ message: 'Error fetching upcoming IPOs' });
  }
});

router.get('/calendar/open', auth, async (req, res) => {
  try {
    const { market = 'both' } = req.query;
    
    let filter = { 
      status: 'open',
      'timeline.openDate': { $lte: new Date() },
      'timeline.closeDate': { $gte: new Date() }
    };
    
    if (market !== 'both') {
      filter.country = market === 'US' ? 'US' : 'IN';
    }

    const openIPOs = await IPO.find(filter)
      .sort({ 'timeline.closeDate': 1 })
      .limit(20);

    res.json({ ipos: openIPOs });
  } catch (error) {
    console.error('Error fetching open IPOs:', error);
    res.status(500).json({ message: 'Error fetching open IPOs' });
  }
});

router.get('/calendar/listed', auth, async (req, res) => {
  try {
    const { market = 'both', days = 30 } = req.query;
    
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));
    
    let filter = { 
      status: 'listed',
      'timeline.listingDate': { $gte: dateFilter }
    };
    
    if (market !== 'both') {
      filter.country = market === 'US' ? 'US' : 'IN';
    }

    const listedIPOs = await IPO.find(filter)
      .sort({ 'timeline.listingDate': -1 })
      .limit(50);

    res.json({ ipos: listedIPOs });
  } catch (error) {
    console.error('Error fetching listed IPOs:', error);
    res.status(500).json({ message: 'Error fetching listed IPOs' });
  }
});

router.get('/compare', auth, async (req, res) => {
  try {
    const { symbols } = req.query;

    if (!symbols) {
      return res.status(400).json({ message: 'Symbols are required for comparison' });
    }

    const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
    const ipos = await IPO.find({ 
      symbol: { $in: symbolArray } 
    });

    if (ipos.length === 0) {
      return res.status(404).json({ message: 'No IPOs found for the given symbols' });
    }

    res.json({ comparison: ipos });
  } catch (error) {
    console.error('Error comparing IPOs:', error);
    res.status(500).json({ message: 'Error comparing IPOs' });
  }
});

router.get('/analysis/:symbol', auth, async (req, res) => {
  try {
    const ipo = await IPO.findOne({ 
      symbol: req.params.symbol.toUpperCase() 
    });

    if (!ipo) {
      return res.status(404).json({ message: 'IPO not found' });
    }

    const analysis = await ipoService.analyzeIPO(ipo.toObject());
    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing IPO:', error);
    res.status(500).json({ message: 'Error analyzing IPO' });
  }
});

module.exports = router;
