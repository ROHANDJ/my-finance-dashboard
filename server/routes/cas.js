const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const auth = require('../middleware/auth');
const router = express.Router();

const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execP = promisify(exec);

// Configurable minimum value threshold for parsed holdings (INR)
const CAS_MIN_VALUE = parseFloat(process.env.CAS_MIN_VALUE || '1000');

// Preprocess extracted text to fix merged tokens and remove decorative/noise lines
function preprocessText(raw) {
  if (!raw) return '';
  let t = String(raw);

  // Remove long decorative or header/footer lines that are unlikely to contain holdings
  t = t.replace(/^\s*[\*\-\u2014\u2013]{2,}.*$/gm, '');
  t = t.replace(/^\s*\*\*\*.*$/gm, '');

  // Insert space between letters and digits when they are stuck together (e.g. "Fund6,000")
  t = t.replace(/([A-Za-z])(?=\d)/g, '$1 ');
  t = t.replace(/(\d)(?=[A-Za-z])/g, '$1 ');

  // Split adjacent numeric sequences that were accidentally merged (e.g. "214,235.46218,786.23")
  // split float next to float
  t = t.replace(/(\d[\d,]*\.\d+)(?=(\d[\d,]*\.\d+))/g, '$1 $2');
  // split integer (with commas) next to integer
  t = t.replace(/(\d{1,3}(?:,\d{3})+)(?=(\d{1,3}(?:,\d{3})+))/g, '$1 $2');

  // Normalize multiple whitespace to single space, but preserve newlines
  t = t.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n');

  // If there's a duplicated summary/table at the end starting with 'Company' header, remove it
  const lines = t.split('\n');
  const compIdx = lines.findIndex(l => /\bCompany\b\s+\bISIN\b|\bMarket Value\b/i.test(l));
  if (compIdx !== -1) {
    // remove header and following block up to 200 lines (likely duplicate footer table)
    lines.splice(compIdx, Math.min(200, lines.length - compIdx));
    t = lines.join('\n');
  }

  return t;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// Helper: filter out lines that are unlikely to be real holding names
function isLikelyHoldingName(s) {
  if (!s) return false;
  const t = String(s).trim();
  if (t.length < 4) return false;
  const low = t.toLowerCase();
  // reject common header/footer words and known noisy phrases
  const noise = /(page\b|statement\b|pan\b|investor\b|email\b|mobile\b|total\b|closing\b|nav\b|valuation\b|folio\b|scheme\b|period\b|date\b|account\b|balance\b|value\b|transaction\b|summary\b|mutual fund\b|equity\b|holdings?\b|signature\b|registrar\b|entry load\b|exit load\b|stamp duty\b|switch in\b|updation of kyc\b|address updated\b|benefits under\b|lateral shift\b|phone\b|contact\b)/i;
  if (noise.test(low)) return false;
  // must contain at least one letter
  if (!/[a-zA-Z]/.test(t)) return false;
  return true;
}

function dedupeHoldings(arr, keyFn) {
  const map = new Map();
  for (const h of arr) {
    try {
      const k = keyFn(h);
      const existing = map.get(k);
      if (!existing || (h.value || 0) > (existing.value || 0)) map.set(k, h);
    } catch (e) {
      // ignore
    }
  }
  return Array.from(map.values());
}

// Parse investor info
function extractInvestorInfo(text) {
  const info = { name: '', pan: '', email: '', mobile: '' };
  const safer = text.replace(/\r/g, '\n');
  const nameMatch = safer.match(/(?:Name|Investor)\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.,'\-]{2,100})(?:\n|PAN|Email|Mobile|$)/i);
  if (nameMatch) info.name = nameMatch[1].trim();
  const panMatch = safer.match(/PAN\s*[:\-]?\s*([A-Z]{5}\d{4}[A-Z])/i);
  if (panMatch) info.pan = (panMatch[1] || '').toUpperCase();
  const emailMatch = safer.match(/Email\s*[:\-]?\s*([\w.+-]+@[\w.-]+\.\w+)/i);
  if (emailMatch) info.email = emailMatch[1];
  const mobileMatch = safer.match(/Mobile\s*[:\-]?\s*(?:\+?91[-\s]?)?(\d{10})/i);
  if (mobileMatch) info.mobile = mobileMatch[1];
  return info;
}

// Parse mutual fund holdings from CAMS/KFintech CAS.
// Works directly on raw extracted text — no letter-digit spacing that would corrupt ISINs.
function parseMutualFunds(rawText) {
  const raw = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const holdings = [];
  let m;

  // 1. Collect all ISIN positions + fund name from the scheme-header line
  const isins = [];
  const isinRx = /ISIN\s*[:\-]\s*(IN[A-Z][\w\d]{9})/gi;
  while ((m = isinRx.exec(raw)) !== null) {
    const lineStart = raw.lastIndexOf('\n', m.index) + 1;
    const lineEnd = raw.indexOf('\n', m.index);
    const line = raw.slice(lineStart, lineEnd > 0 ? lineEnd : raw.length);
    // Strip "- ISIN: INFxxx (Advisor: ...)" suffix, then strip scheme-code prefix like "P8004-"
    let name = line.replace(/\s*[-–]\s*ISIN.*$/i, '').replace(/\s*ISIN.*$/i, '').trim();
    name = name.replace(/^[A-Z\d]+-/i, '').trim();
    if (name.length < 4) {
      // fallback: grab the line above
      const prevEnd = lineStart - 1;
      const prevStart = raw.lastIndexOf('\n', prevEnd - 1) + 1;
      name = raw.slice(prevStart, prevEnd).trim().replace(/^[A-Z\d]+-/i, '').trim();
    }
    isins.push({ pos: m.index, isin: m[1], name });
  }

  // 2. Collect all "Closing Unit Balance" positions
  const closings = [];
  const closingRx = /Closing\s*(?:Unit\s*)?Balance\s*[:\-]\s*([\d,]+\.?\d*)/gi;
  while ((m = closingRx.exec(raw)) !== null) {
    closings.push({ pos: m.index, units: parseFloat(m[1].replace(/,/g, '')) });
  }

  // 3. Collect all NAV positions — "NAV on DD-Mon-YYYY: INR X.XXXX"
  const navs = [];
  const navRx = /NAV\s+on\s+[\d\w\s\-,]+[:\-]\s*(?:INR|₹)\s*([\d,]+\.?\d+)/gi;
  while ((m = navRx.exec(raw)) !== null) {
    navs.push({ pos: m.index, nav: parseFloat(m[1].replace(/,/g, '')) });
  }

  // 4. For each ISIN section (from this ISIN to the next), find closing balance + nearest NAV
  if (isins.length > 0 && closings.length > 0 && navs.length > 0) {
    for (let i = 0; i < isins.length; i++) {
      const secStart = isins[i].pos;
      const secEnd = i + 1 < isins.length ? isins[i + 1].pos : raw.length;

      const secClosings = closings.filter(c => c.pos >= secStart && c.pos < secEnd);
      if (secClosings.length === 0) continue;
      const closing = secClosings[secClosings.length - 1];
      if (closing.units <= 0) continue;

      // Allow NAV to appear just before section end (some RTAs place it after closing line)
      const secNavs = navs.filter(n => n.pos >= secStart && n.pos < secEnd + 800);
      if (secNavs.length === 0) continue;
      const navEntry = secNavs.reduce((a, b) =>
        Math.abs(a.pos - closing.pos) <= Math.abs(b.pos - closing.pos) ? a : b);
      if (navEntry.nav <= 0) continue;

      const value = closing.units * navEntry.nav;
      if (value >= CAS_MIN_VALUE) {
        holdings.push({
          type: 'mutual_fund',
          name: isins[i].name || isins[i].isin,
          isin: isins[i].isin,
          units: closing.units,
          nav: navEntry.nav,
          value,
          currency: 'INR'
        });
      }
    }
  }

  if (holdings.length > 0) {
    return dedupeHoldings(holdings, h => ((h.isin || '') + '|' + (h.name || '').toLowerCase()));
  }

  // Heuristic fallback for non-standard PDFs
  const processed = preprocessText(rawText);
  const fallback = [];
  const lines = processed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const nums = lines[i].match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?/g);
    if (nums && nums.length >= 2) {
      const nameCandidate = i > 0 ? lines[i - 1] : 'Mutual Fund';
      const units = parseFloat(nums[nums.length - 2].replace(/,/g, ''));
      const nav = parseFloat(nums[nums.length - 1].replace(/,/g, ''));
      if (units > 0 && nav > 0 && isLikelyHoldingName(nameCandidate) && (units * nav) >= CAS_MIN_VALUE) {
        fallback.push({ type: 'mutual_fund', name: nameCandidate, isin: '', units, nav, value: units * nav, currency: 'INR' });
      }
    }
  }
  return dedupeHoldings(fallback, h => ((h.isin || '') + '|' + (h.name || '').toLowerCase()));
}

// Parse equity/demat holdings
function parseEquities(text) {
  text = preprocessText(text);
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
    if (isLikelyHoldingName(name) && quantity > 0 && value >= CAS_MIN_VALUE) {
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

  // Fallback: lines containing company name then quantity and value without ISIN
  if (holdings.length === 0) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const nums = lines[i].match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?/g);
      if (nums && nums.length >= 2) {
        const nameCandidate = (i > 0) ? lines[i - 1] : lines[i];
        const quantity = parseInt(nums[0].replace(/,/g, ''), 10);
        const value = parseFloat(nums[nums.length - 1].replace(/,/g, ''));
        if (isLikelyHoldingName(nameCandidate) && quantity > 0 && value >= CAS_MIN_VALUE) {
          holdings.push({ type: 'stock', name: nameCandidate, isin: '', quantity, value, currency: 'INR' });
        }
      }
    }
  }

  // dedupe and return
  return dedupeHoldings(holdings, h => ((h.isin || '') + '|' + (h.name || '').toLowerCase()));
}

// Extract date range from CAS
function extractDateRange(text) {
  const match = text.match(/(?:From|Period)\s*[:\-]\s*(\d{2}[-\/]\w{3,}[-\/]\d{4})\s+(?:To|to)\s+(\d{2}[-\/]\w{3,}[-\/]\d{4})/i);
  if (match) return { from: match[1], to: match[2] };
  return {};
}

// Allow unauthenticated uploads for CAS parsing (parsing is stateless and not stored)
router.post('/upload', upload.single('cas'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No PDF file uploaded' });
  }
  // keep providedPassword available to catch block
  let providedPassword = '';

  try {
    providedPassword = req.body.password || '';
    const options = {};
    if (providedPassword) {
      options.password = providedPassword;
    }

    // Try parsing with the provided password and some common variants when applicable.
    // pdf-parse v1.1.1 passes only the raw buffer to PDFJS.getDocument() and silently
    // ignores the password option, so we use the bundled pdfjs directly for password attempts.
    async function parsePdfWithPasswordAttempts(buffer, providedPassword) {
      if (!providedPassword) {
        return await pdfParse(buffer, {});
      }

      const PDFJS = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
      PDFJS.disableWorker = true;

      const p = String(providedPassword);
      const seen = new Set();
      const variants = [p, p.trim(), p.toUpperCase(), p.trim().toUpperCase(),
                        p.replace(/\s+/g, ''), p.toUpperCase().replace(/\s+/g, '')]
        .filter(v => { if (!v || seen.has(v)) return false; seen.add(v); return true; });

      const tried = [];
      const attempts = [];
      let lastErr = null;

      for (const pwd of variants) {
        tried.push(pwd);
        try {
          const doc = await PDFJS.getDocument({ data: buffer, password: pwd });
          const numPages = doc.numPages;
          let text = '';
          for (let i = 1; i <= numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
            let lastY, pageText = '';
            for (const item of content.items) {
              if (lastY == item.transform[5] || !lastY) {
                pageText += item.str;
              } else {
                pageText += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            text += '\n\n' + pageText;
            if (page.cleanup) page.cleanup();
          }
          const meta = await doc.getMetadata().catch(() => null);
          doc.destroy();
          attempts.push({ password: pwd, ok: true, message: 'parsed' });
          console.info('pdfjs succeeded with password variant:', pwd === p ? 'original' : pwd);
          return {
            text,
            numpages: numPages,
            info: meta ? meta.info : null,
            metadata: meta ? meta.metadata : null,
            _usedPassword: pwd,
            _attempts: attempts
          };
        } catch (e) {
          lastErr = e;
          const em = String(e && e.message || '');
          attempts.push({ password: pwd, ok: false, message: em });
          const eml = em.toLowerCase();
          if (!eml.includes('password') && !eml.includes('decrypt') && !eml.includes('encrypted') && !eml.includes('incorrect') && !eml.includes('no password')) {
            const err = new Error('Non-password error during pdfjs');
            err.inner = e;
            err.attempts = attempts;
            throw err;
          }
          console.warn('pdfjs password attempt failed for variant:', pwd, 'err:', em);
        }
      }

      const err = lastErr || new Error('Failed to parse PDF with provided password variants');
      err.triedPasswords = tried;
      err.attempts = attempts;
      throw err;
    }

    const data = await parsePdfWithPasswordAttempts(req.file.buffer, providedPassword);
    let text = data.text || '';

    // Log basic debug info to help diagnose parsing failures
    console.info('CAS parse: pages=%s, info=%j, textLength=%d',
      data.numpages || 0,
      data.info || {},
      text.length);

    // If extracted text is very small, it's likely an image-only (scanned) PDF
    if (!text || text.trim().length < 100) {
      // Try OCR fallback using system `pdftoppm` + `tesseract` if available
      try {
        const ocrText = await runOcrFallback(req.file.buffer);
        if (ocrText && ocrText.trim().length > 50) {
          text = ocrText;
        } else {
          const snippet = ocrText ? ocrText.slice(0, 500) : '';
          return res.status(422).json({
            message: 'Could not extract searchable text from the PDF. The PDF appears to be scanned and OCR did not return usable text.',
            hint: 'Install `poppler-utils` (provides `pdftoppm`) and `tesseract-ocr` on the server, or upload a searchable PDF.',
            debug: {
              pages: data.numpages || 0,
              info: data.info || {},
              textLength: (ocrText || '').length,
              snippet
            },
            needsOcr: true
          });
        }
      } catch (ocrErr) {
        console.error('OCR fallback error:', ocrErr);
        return res.status(422).json({
          message: 'Could not extract searchable text from the PDF and OCR fallback failed.',
          hint: 'Ensure `pdftoppm` and `tesseract` are installed and available in PATH, or upload a searchable PDF.',
          error: ocrErr.message || String(ocrErr),
          needsOcr: true
        });
      }
    }

    const investor = extractInvestorInfo(text);
    const mutualFunds = parseMutualFunds(text);
    const equities = parseEquities(text);
    const dateRange = extractDateRange(text);

    const totalValue = [...mutualFunds, ...equities].reduce((sum, h) => sum + (h.value || 0), 0);

    // collect some potential lines for debug when no holdings were detected
    const potentialLines = (() => {
      try {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const candidates = lines.filter(l => /\b(NAV|Closing|Closing Unit|Closing Balance|Valuation|INR|₹)\b/i.test(l) || /\d{1,3}(?:,\d{3})*(?:\.\d+)?/.test(l));
        return candidates.slice(0, 200);
      } catch (e) { return []; }
    })();

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
      ,
      // dev-only debug info: include attempt trace, masked password, and raw text snippet
      ...(process.env.NODE_ENV !== 'production' ? {
        debug: {
          attempts: data._attempts || [],
          usedPasswordMasked: data._usedPassword ? ('****' + String(data._usedPassword).slice(-2)) : undefined,
          rawText: text.slice(0, 5000),
          rawTextLength: text.length
          ,potentialLines: potentialLines
        }
      } : {})
    });
  } catch (err) {
    const em = String(err && err.message || '').toLowerCase();
    if (em.includes('password') || em.includes('decrypt') || em.includes('encrypted') || em.includes('incorrect')) {
      const tried = err.triedPasswords || [];
      const attempts = err.attempts || [];
      const msg = providedPassword
        ? 'Incorrect password. Tried common variants. Confirm your PAN+DOB or try other variants.'
        : 'This PDF is password-protected. Please enter the password.';
      console.error('CAS parse password error:', err.message, 'tried:', tried, 'attempts:', attempts);
      return res.status(422).json({ message: msg, passwordRequired: true, error: err.message, tried, attempts });
    }
    console.error('CAS parse error:', err);
    res.status(500).json({ message: 'Failed to parse CAS PDF', error: err.message });
  }
});

// OCR fallback: requires `pdftoppm` (from poppler-utils) and `tesseract` installed on the host.
// Writes the uploaded PDF buffer to a temp file, converts pages to PNG using pdftoppm,
// runs tesseract on each PNG to extract text, concatenates results and returns it.
async function runOcrFallback(pdfBuffer) {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cas-ocr-'));
  const pdfPath = path.join(tmpDir, 'upload.pdf');
  await fs.promises.writeFile(pdfPath, pdfBuffer);

  try {
    // Convert PDF pages to PNG files: out-1.png, out-2.png, ...
    const outPrefix = path.join(tmpDir, 'page');
    // pdftoppm -png upload.pdf page
    await execP(`pdftoppm -png ${escapePath(pdfPath)} ${escapePath(outPrefix)}`);

    // Find generated PNGs
    const files = await fs.promises.readdir(tmpDir);
    const pngs = files.filter(f => f.endsWith('.png')).sort();
    if (pngs.length === 0) throw new Error('No PNG pages produced by pdftoppm');

    let combined = '';
    for (const png of pngs) {
      const pngPath = path.join(tmpDir, png);
      // tesseract image.png stdout -l eng
      const { stdout } = await execP(`tesseract ${escapePath(pngPath)} stdout -l eng`);
      combined += '\n' + stdout;
    }

    return combined;
  } finally {
    // cleanup temp dir
    try {
      const items = await fs.promises.readdir(tmpDir);
      await Promise.all(items.map(it => fs.promises.unlink(path.join(tmpDir, it))).catch(() => {}));
      await fs.promises.rmdir(tmpDir).catch(() => {});
    } catch (e) {
      // ignore cleanup errors
    }
  }
}

function escapePath(p) {
  // basic quoting for shell safety on most platforms
  if (process.platform === 'win32') {
    return `"${p.replace(/"/g, '\\"')}"`;
  }
  return `'${p.replace(/'/g, "'\\''")}'`;
}

module.exports = router;
