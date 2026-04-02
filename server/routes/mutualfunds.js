const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const router = express.Router();

class MutualFundService {
  constructor() {
    this.amfiApiKey = process.env.AMFI_API_KEY;
    this.morningstarApiKey = process.env.MORNINGSTAR_API_KEY;
  }

  async searchMutualFunds(query) {
    try {
      const response = await axios.get(
        `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`
      );

      return response.data.map(fund => ({
        schemeCode: fund.scheme_code,
        schemeName: fund.scheme_name,
        amc: fund.amc,
        category: fund.category,
        nav: fund.nav,
        date: fund.date
      }));
    } catch (error) {
      console.error('Error searching mutual funds:', error);
      throw error;
    }
  }

  async getFundNAV(schemeCode) {
    try {
      const response = await axios.get(
        `https://api.mfapi.in/mf/${schemeCode}`
      );

      const data = response.data;
      return {
        schemeCode: data.meta.scheme_code,
        schemeName: data.meta.scheme_name,
        amc: data.meta.amc_name,
        category: data.meta.fund_type,
        nav: data.data[0].nav,
        date: data.data[0].date,
        historicalData: data.data.map(item => ({
          date: item.date,
          nav: item.nav
        }))
      };
    } catch (error) {
      console.error('Error fetching fund NAV:', error);
      throw error;
    }
  }

  async getFundDetails(schemeCode) {
    try {
      const navData = await this.getFundNAV(schemeCode);
      
      const returns = this.calculateReturns(navData.historicalData);
      
      return {
        ...navData,
        returns,
        risk: this.calculateRisk(navData.historicalData),
        rating: await this.getFundRating(schemeCode)
      };
    } catch (error) {
      console.error('Error fetching fund details:', error);
      throw error;
    }
  }

  calculateReturns(historicalData) {
    if (historicalData.length < 2) return {};

    const latestNAV = parseFloat(historicalData[0].nav);
    const returns = {};

    const periods = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '3Y': 1095,
      '5Y': 1825
    };

    Object.entries(periods).forEach(([period, days]) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - days);
      
      const pastNAV = historicalData.find(item => 
        new Date(item.date) <= pastDate
      );

      if (pastNAV) {
        const pastValue = parseFloat(pastNAV.nav);
        returns[period] = ((latestNAV - pastValue) / pastValue) * 100;
      }
    });

    return returns;
  }

  calculateRisk(historicalData) {
    if (historicalData.length < 2) return {};

    const navs = historicalData.map(item => parseFloat(item.nav));
    const returns = [];
    
    for (let i = 1; i < navs.length; i++) {
      returns.push((navs[i] - navs[i-1]) / navs[i-1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const standardDeviation = Math.sqrt(variance);
    const sharpeRatio = mean / standardDeviation;

    return {
      standardDeviation,
      sharpeRatio,
      maxDrawdown: this.calculateMaxDrawdown(navs)
    };
  }

  calculateMaxDrawdown(navs) {
    let maxDrawdown = 0;
    let peak = navs[0];

    for (let i = 1; i < navs.length; i++) {
      if (navs[i] > peak) {
        peak = navs[i];
      } else {
        const drawdown = (peak - navs[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    return maxDrawdown * 100;
  }

  async getFundRating(schemeCode) {
    try {
      const response = await axios.get(
        `https://api.morningstar.in/service/v1/funds/overview/${schemeCode}`
      );

      if (response.data && response.data.rating) {
        return {
          morningstar: response.data.rating.morningstar,
          valueResearch: response.data.rating.valueResearch,
          crisil: response.data.rating.crisil
        };
      }

      return { morningstar: 0, valueResearch: 0, crisil: 0 };
    } catch (error) {
      console.error('Error fetching fund rating:', error);
      return { morningstar: 0, valueResearch: 0, crisil: 0 };
    }
  }

  async getTopFunds(category = 'all') {
    try {
      let url = 'https://api.mfapi.in/mf';
      if (category !== 'all') {
        url += `?category=${encodeURIComponent(category)}`;
      }

      const response = await axios.get(url);
      
      const funds = response.data.slice(0, 50);
      const fundDetails = await Promise.all(
        funds.map(async (fund) => {
          try {
            const details = await this.getFundDetails(fund.scheme_code);
            return details;
          } catch (error) {
            console.error(`Error fetching details for ${fund.scheme_code}:`, error);
            return null;
          }
        })
      );

      return fundDetails.filter(Boolean).sort((a, b) => 
        (b.returns['1Y'] || 0) - (a.returns['1Y'] || 0)
      ).slice(0, 20);
    } catch (error) {
      console.error('Error fetching top funds:', error);
      throw error;
    }
  }

  async getFundCategories() {
    try {
      const response = await axios.get('https://api.mfapi.in/mf');
      const categories = [...new Set(response.data.map(fund => fund.category))];
      return categories;
    } catch (error) {
      console.error('Error fetching fund categories:', error);
      throw error;
    }
  }

  async compareFunds(schemeCodes) {
    try {
      const comparison = await Promise.all(
        schemeCodes.map(async (code) => {
          try {
            return await this.getFundDetails(code);
          } catch (error) {
            console.error(`Error fetching details for ${code}:`, error);
            return null;
          }
        })
      );

      return comparison.filter(Boolean);
    } catch (error) {
      console.error('Error comparing funds:', error);
      throw error;
    }
  }
}

const mutualFundService = new MutualFundService();

router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const funds = await mutualFundService.searchMutualFunds(q);
    res.json({ funds });
  } catch (error) {
    console.error('Error searching mutual funds:', error);
    res.status(500).json({ message: 'Error searching mutual funds' });
  }
});

router.get('/nav/:schemeCode', auth, async (req, res) => {
  try {
    const { schemeCode } = req.params;

    const navData = await mutualFundService.getFundNAV(schemeCode);
    res.json({ fund: navData });
  } catch (error) {
    console.error('Error fetching fund NAV:', error);
    res.status(500).json({ message: 'Error fetching fund NAV' });
  }
});

router.get('/details/:schemeCode', auth, async (req, res) => {
  try {
    const { schemeCode } = req.params;

    const fundDetails = await mutualFundService.getFundDetails(schemeCode);
    res.json({ fund: fundDetails });
  } catch (error) {
    console.error('Error fetching fund details:', error);
    res.status(500).json({ message: 'Error fetching fund details' });
  }
});

router.get('/top', auth, async (req, res) => {
  try {
    const { category = 'all' } = req.query;

    const topFunds = await mutualFundService.getTopFunds(category);
    res.json({ funds: topFunds });
  } catch (error) {
    console.error('Error fetching top funds:', error);
    res.status(500).json({ message: 'Error fetching top funds' });
  }
});

router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await mutualFundService.getFundCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching fund categories:', error);
    res.status(500).json({ message: 'Error fetching fund categories' });
  }
});

router.post('/compare', auth, async (req, res) => {
  try {
    const { schemeCodes } = req.body;

    if (!schemeCodes || !Array.isArray(schemeCodes) || schemeCodes.length < 2) {
      return res.status(400).json({ message: 'At least 2 scheme codes are required for comparison' });
    }

    const comparison = await mutualFundService.compareFunds(schemeCodes);
    res.json({ comparison });
  } catch (error) {
    console.error('Error comparing funds:', error);
    res.status(500).json({ message: 'Error comparing funds' });
  }
});

router.get('/sip-calculator', auth, async (req, res) => {
  try {
    const { amount, period, expectedReturn = 12 } = req.query;

    if (!amount || !period) {
      return res.status(400).json({ message: 'Amount and period are required' });
    }

    const monthlyAmount = parseFloat(amount);
    const months = parseInt(period);
    const annualReturn = parseFloat(expectedReturn) / 100;
    const monthlyReturn = annualReturn / 12;

    const futureValue = monthlyAmount * 
      ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn) * 
      (1 + monthlyReturn);

    const totalInvestment = monthlyAmount * months;
    const totalReturns = futureValue - totalInvestment;

    res.json({
      investment: totalInvestment,
      futureValue,
      returns: totalReturns,
      returnPercentage: (totalReturns / totalInvestment) * 100
    });
  } catch (error) {
    console.error('Error calculating SIP:', error);
    res.status(500).json({ message: 'Error calculating SIP' });
  }
});

module.exports = router;
