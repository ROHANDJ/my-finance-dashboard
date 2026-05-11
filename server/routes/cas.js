const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const auth = require('../middleware/auth');
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// Parse investor info
function extractInvestorInfo(text) {
  const info = { name: '', pan: '', email: '', mobile: '' };
  const nameMatch = text.match(/(?:Name|Investor)\s*[:\-]\s*([A-Z][A-Za-z\s]+?)(?:\n|PAN|Email|Mobile)/);
  if (nameMatch) info.name = nameMatch[1].trim();
  const panMatch = text.match(/PAN\s*[:\-]\s*([A-Z]{5}\d{4}[A-Z])/);
  if (panMatch) info.pan = panMatch[1];
  const emailMatch = text.match(/Email\s*[:\-]\s*([\w.+-]+@[\w.-]+\.\w+)/i);
  if (emailMatch) info.email = emailMatch[1];
  const mobileMatch = text.match(/Mobile\s*[:\-]\s*(\d{10})/);
  if (mobileMatch) info.mobile = mobileMatch[1];
  return info;
}

// Parse mutual fund holdings from CAMS CAS
function parseMutualFunds(text) {
  const holdings = [];

  // Split by fund house sections — each fund house name is typically in ALL CAPS
  // Pattern: scheme name on one line, then closing balance line
  const schemePattern = /([A-Za-z][^\n]+?)\s*[-–]\s*(?:ISIN\s*[:\-]\s*(INF[\w\d]{10}))?[^\n]*\n[\s\S]*?Closing Unit Balance\s*[:\-]?\s*([\d,]+\.?\d*)\s+NAV\s+(?:on\s+[\d\w\-]+\s*[:\-]?\s*)?(?:INR\s*)?([\d,]+\.?\d+)\s+Valuation\s+(?:on\s+[\d\w\-\s]+)?[:\-]?\s*INR\s*([\d,]+\.?\d*)/gi;

  let match;
  while ((match = schemePattern.exec(text)) !== null) {
    const units = parseFloat(match[3].replace(/,/g, ''));
    const nav = parseFloat(match[4].replace(/,/g, ''));
    const value = parseFloat(match[5].replace(/,/g, ''));
    if (units > 0 && nav > 0) {
      holdings.push({
        type: 'mutual_fund',
        name: match[1].trim(),
        isin: match[2] || '',
        units,
        nav,
        value,
        currency: 'INR'
      });
    }
  }

  // Fallback: simpler pattern for different CAS versions
  if (holdings.length === 0) {
    const simplePattern = /Closing Balance\s*[:\-]?\s*([\d,]+\.?\d*)\s+(?:units?\s+)?(?:@\s*INR\s*)?([\d,]+\.?\d+)/gi;
    while ((match = simplePattern.exec(text)) !== null) {
      const units = parseFloat(match[1].replace(/,/g, ''));
      const nav = parseFloat(match[2].replace(/,/g, ''));
      if (units > 0 && nav > 0) {
        holdings.push({
          type: 'mutual_fund',
          name: 'Mutual Fund',
          isin: '',
          units,
          nav,
          value: units * nav,
          currency: 'INR'
        });
      }
    }
  }

  return holdings;
}

// Parse equity/demat holdings
function parseEquities(text) {
  const holdings = [];

  // CDSL/NSDL demat section pattern
  // Company Name   ISIN   Quantity   Market Value
  const eqPattern = /([A-Za-z][A-Za-z\s&\.\-]+?)\s+(INE[\w\d]{10})\s+[\w\s]*?(\d[\d,]*)\s+(?:INR\s*)?([\d,]+\.?\d*)/g;

  let match;
  while ((match = eqPattern.exec(text)) !== null) {
    const name = match[1].trim();
    const isin = match[2];
    const quantity = parseInt(match[3].replace(/,/g, ''), 10);
    const value = parseFloat(match[4].replace(/,/g, ''));
    // Filter out noise — skip if name is too short or quantity is 0
    if (name.length > 3 && quantity > 0 && value > 0) {
      holdings.push({
        type: 'stock',
        name,
        isin,
        quantity,
        value,
        currency: 'INR'
      });
    }
  }

  return holdings;
}

// Extract date range from CAS
function extractDateRange(text) {
  const match = text.match(/(?:From|Period)\s*[:\-]\s*(\d{2}[-\/]\w{3,}[-\/]\d{4})\s+(?:To|to)\s+(\d{2}[-\/]\w{3,}[-\/]\d{4})/i);
  if (match) return { from: match[1], to: match[2] };
  return {};
}

router.post('/upload', auth, upload.single('cas'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No PDF file uploaded' });
  }

  try {
    const providedPassword = req.body.password || '';
    const options = {};
    if (providedPassword) {
      options.password = providedPassword;
    }

    const data = await pdfParse(req.file.buffer, options);
    const text = data.text;

    if (!text || text.length < 100) {
      return res.status(422).json({
        message: 'Could not extract text from PDF. If the PDF is password-protected, provide the password.'
      });
    }

    const investor = extractInvestorInfo(text);
    const mutualFunds = parseMutualFunds(text);
    const equities = parseEquities(text);
    const dateRange = extractDateRange(text);

    const totalValue = [...mutualFunds, ...equities].reduce((sum, h) => sum + (h.value || 0), 0);

    res.json({
      success: true,
      investor,
      dateRange,
      summary: {
        totalHoldings: mutualFunds.length + equities.length,
        mutualFundCount: mutualFunds.length,
        equityCount: equities.length,
        totalValue
      },
      mutualFunds,
      equities
    });
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('password')) {
      const msg = providedPassword
        ? 'Incorrect password. Common formats:\n• CAMS CAS: PAN uppercase + DOB as DDMMYYYY (e.g. ABCDE1234F01011990)\n• CDSL CAS: PAN uppercase + DOB as DDMMYYYY\n• Some CDSL PDFs: just your PAN in uppercase'
        : 'This PDF is password-protected. Please enter the password.';
      return res.status(422).json({ message: msg, passwordRequired: true });
    }
    console.error('CAS parse error:', err);
    res.status(500).json({ message: 'Failed to parse CAS PDF', error: err.message });
  }
});

module.exports = router;
