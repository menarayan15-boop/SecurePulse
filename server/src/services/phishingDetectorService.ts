import { URL } from 'url';

export interface IPhishingScanResult {
  riskScore: number; // 0 - 100
  riskLevel: 'low' | 'medium' | 'high';
  targetSummary: string;
  threatIndicators: string[];
  recommendations: string[];
  details: Record<string, any>;
}

// Suspicious Top Level Domains commonly exploited in disposable phishing campaigns
const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'zip', 'mov', 'buzz', 'gq', 'cf', 'tk', 'ml', 'ga', 
  'click', 'rest', 'cam', 'work', 'country', 'stream', 'download', 'racing', 'loan'
]);

// High-target brands frequently impersonated
const TARGETED_BRANDS = [
  'paypal', 'google', 'microsoft', 'apple', 'amazon', 'netflix', 
  'chase', 'bankofamerica', 'wellsfargo', 'binance', 'coinbase', 
  'facebook', 'instagram', 'whatsapp', 'meta', 'twitter', 'securepulse'
];

// Known URL shorteners
const KNOWN_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'ow.ly', 'rb.gy', 'shorte.st'
]);

// Private & reserved IP patterns for SSRF prevention
const PRIVATE_IP_REGEX = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|fc00:|fe80:|::1|0\.0\.0\.0)/i;

/**
 * Validates whether a target host or URL is attempting SSRF against loopback or private infrastructure.
 */
export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '::1' || clean === '0.0.0.0') {
    return true;
  }
  return PRIVATE_IP_REGEX.test(clean);
}

/**
 * Heuristically inspects a target URL for phishing, deception, brand impersonation, and domain manipulation.
 * NEVER connects to or executes the remote URL (100% offline & safe from SSRF).
 */
export function analyzeUrlSafety(rawUrl: string): IPhishingScanResult {
  let trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      riskScore: 75,
      riskLevel: 'high',
      targetSummary: rawUrl.slice(0, 100),
      threatIndicators: ['Malformed or invalid URL syntax', 'Potential URI scheme injection'],
      recommendations: [
        'Do not visit this link.',
        'Malformed URLs are frequently used to evade standard browser security filters.'
      ],
      details: { validUrl: false },
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const search = parsed.search.toLowerCase();
  const fullUrl = parsed.href.toLowerCase();

  const threatIndicators: string[] = [];
  const recommendations: string[] = [];
  let score = 5; // Base low baseline

  // 1. SSRF / Localhost check
  if (isPrivateOrLoopbackHost(hostname)) {
    threatIndicators.push('URL targets private local network or loopback address (SSRF risk)');
    score += 80;
  }

  // 2. IP Address in Hostname (e.g. http://192.168.1.1/login)
  const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.startsWith('[');
  if (isIpHost) {
    threatIndicators.push('Host uses a direct raw IP address rather than a verified domain name');
    score += 45;
  }

  // 3. HTTP vs HTTPS
  if (parsed.protocol === 'http:') {
    threatIndicators.push('Insecure connection protocol (HTTP without TLS encryption)');
    score += 20;
    recommendations.push('Never enter credentials or personal data over unencrypted HTTP.');
  }

  // 4. Punycode / IDN Homoglyph detection (e.g., xn--...)
  if (hostname.includes('xn--')) {
    threatIndicators.push('Internationalized Domain Name (Punycode / Homoglyph) detected; may impersonate legitimate alphabet characters');
    score += 40;
    recommendations.push('Inspect the actual destination domain for lookalike Cyrillic or Greek characters.');
  }

  // 5. Suspicious TLD
  const domainParts = hostname.split('.');
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : '';
  if (SUSPICIOUS_TLDS.has(tld)) {
    threatIndicators.push(`Domain uses high-abuse or disposable Top-Level Domain (.${tld})`);
    score += 30;
  }

  // 6. Excessive subdomains (e.g. login.secure.verify.paypal.fake-domain.com)
  if (domainParts.length > 4) {
    threatIndicators.push(`Excessive subdomain nesting (${domainParts.length} levels) designed to obscure true root domain`);
    score += 25;
  }

  // 7. Brand Impersonation Heuristics
  for (const brand of TARGETED_BRANDS) {
    if (fullUrl.includes(brand)) {
      // Check if root domain actually is the brand
      const isLegitBrand = hostname === `${brand}.com` || hostname.endsWith(`.${brand}.com`);
      if (!isLegitBrand) {
        threatIndicators.push(`Deceptive brand name match: '${brand}' found in non-authoritative domain '${hostname}'`);
        score += 40;
        recommendations.push(`This page appears to impersonate ${brand.toUpperCase()}. Verify directly via the official ${brand}.com website.`);
        break;
      }
    }
  }

  // 8. Obfuscation & Credential Harvesting keywords
  const suspiciousKeywords = [
    'login', 'signin', 'verify', 'verification', 'account-update', 'banking', 
    'wallet', 'recovery', 'security-checkpoint', 'confirm-identity', 'auth-token'
  ];
  let matchedKeywords = 0;
  for (const kw of suspiciousKeywords) {
    if (hostname.includes(kw) || pathname.includes(kw)) {
      matchedKeywords++;
    }
  }
  if (matchedKeywords > 0) {
    threatIndicators.push(`Suspicious authentication/harvesting keywords detected in URL path (${matchedKeywords} matched)`);
    score += Math.min(matchedKeywords * 15, 30);
  }

  // 9. URL Shortener Service
  if (KNOWN_SHORTENERS.has(hostname)) {
    threatIndicators.push(`URL shortening service '${hostname}' detected (hides real destination)`);
    score += 25;
    recommendations.push('Use a URL expander to inspect the real final destination before opening.');
  }

  // 10. Embedded Credentials or At-sign (@) in URL
  if (rawUrl.includes('@')) {
    threatIndicators.push('URL contains an "@" symbol (often used to trick browser address bars)');
    score += 35;
  }

  // Clamp score 0 - 100
  score = Math.max(0, Math.min(100, score));

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (score >= 70) {
    riskLevel = 'high';
  } else if (score >= 40) {
    riskLevel = 'medium';
  }

  if (recommendations.length === 0) {
    if (riskLevel === 'high') {
      recommendations.push('Do NOT click or open this link. It exhibits strong indicators of a malicious phishing trap.');
      recommendations.push('Report this URL to your IT security administrator or browser security provider.');
    } else if (riskLevel === 'medium') {
      recommendations.push('Exercise caution. Verify the sender and compare the domain name with the authentic organization.');
      recommendations.push('Do not submit sensitive passwords or financial credentials.');
    } else {
      recommendations.push('No obvious malicious patterns found. Standard web browsing precautions still apply.');
    }
  }

  return {
    riskScore: score,
    riskLevel,
    targetSummary: parsed.origin + parsed.pathname.slice(0, 40),
    threatIndicators: threatIndicators.length > 0 ? threatIndicators : ['Domain structure appears standard without obvious deception indicators.'],
    recommendations,
    details: {
      hostname,
      protocol: parsed.protocol,
      tld,
      subdomainsCount: domainParts.length,
      hasTls: parsed.protocol === 'https:',
      heuristicEngine: 'SecurePulse Threat Intelligence v2.0',
    },
  };
}

/**
 * Analyzes raw email text or message content for social engineering, urgency, credential harvesting, and financial scam cues.
 */
export function analyzeContentSafety(content: string, type: 'email' | 'message'): IPhishingScanResult {
  const text = content.toLowerCase();
  const threatIndicators: string[] = [];
  const recommendations: string[] = [];
  let score = 10;

  // 1. High Urgency & Intimidation tactics
  const urgencyPhrases = [
    'immediate action required', 'account suspended', 'suspended within 24 hours', 
    'unauthorized transaction', 'security breach detected', 'urgent verification', 
    'access will be terminated', 'final notice', 'action required immediately'
  ];
  let matchedUrgency = 0;
  for (const phrase of urgencyPhrases) {
    if (text.includes(phrase)) {
      matchedUrgency++;
    }
  }
  if (matchedUrgency > 0) {
    threatIndicators.push(`High-pressure psychological urgency detected (${matchedUrgency} urgency triggers)`);
    score += Math.min(matchedUrgency * 15, 35);
  }

  // 2. Financial / Payment / Gift Card Demands
  const financialPhrases = [
    'wire transfer', 'gift card', 'bitcoin', 'crypto payment', 
    'refund pending', 'invoice payment', 'western union', 'zelle payment'
  ];
  for (const phrase of financialPhrases) {
    if (text.includes(phrase)) {
      threatIndicators.push(`Unusual financial transaction or untraceable payment method referenced: '${phrase}'`);
      score += 25;
      break;
    }
  }

  // 3. Credential Harvesting Cues
  const harvestingPhrases = [
    'verify your password', 'reset your passcode', 'enter your otp', 
    'confirm your credit card', 'provide your ssn', 'update payment details immediately'
  ];
  for (const phrase of harvestingPhrases) {
    if (text.includes(phrase)) {
      threatIndicators.push(`Credential or sensitive personal information solicitation: '${phrase}'`);
      score += 35;
      break;
    }
  }

  // 4. Fake Delivery Scams
  const deliveryPhrases = ['parcel on hold', 'package delivery failed', 'customs fee pending', 'reschedule parcel'];
  for (const phrase of deliveryPhrases) {
    if (text.includes(phrase)) {
      threatIndicators.push(`Common postal/delivery impersonation lure detected: '${phrase}'`);
      score += 20;
      break;
    }
  }

  // 5. Impersonal Generic Greetings
  const genericGreetings = ['dear customer', 'dear user', 'dear account holder', 'valued client', 'dear client'];
  for (const greeting of genericGreetings) {
    if (text.includes(greeting)) {
      threatIndicators.push(`Generic, impersonal greeting used ('${greeting}') instead of authenticated name`);
      score += 15;
      break;
    }
  }

  // 6. Extracted URL check inside content
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi;
  const extractedUrls = content.match(urlRegex) || [];
  if (extractedUrls.length > 0) {
    threatIndicators.push(`Content contains ${extractedUrls.length} embedded web link(s)`);
    // Inspect first extracted URL
    const targetUrl = extractedUrls[0];
    if (targetUrl) {
      const urlAnalysis = analyzeUrlSafety(targetUrl);
      if (urlAnalysis.riskLevel === 'high') {
        threatIndicators.push(`Embedded link flagged as HIGH RISK: ${urlAnalysis.threatIndicators[0]}`);
        score += 35;
      } else if (urlAnalysis.riskLevel === 'medium') {
        score += 15;
      }
    }
  }

  score = Math.max(0, Math.min(100, score));

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (score >= 70) {
    riskLevel = 'high';
  } else if (score >= 40) {
    riskLevel = 'medium';
  }

  if (riskLevel === 'high') {
    recommendations.push('Do NOT click any links, open attachments, or reply to this message.');
    recommendations.push('Legitimate security organizations will never ask for your password or OTP via email/SMS.');
    recommendations.push('Contact the organization directly through verified official channels (e.g. official app or website).');
  } else if (riskLevel === 'medium') {
    recommendations.push('Exercise caution. Verify the sender email header and domain authenticity.');
    recommendations.push('Check your account status by navigating to the official app or website independently.');
  } else {
    recommendations.push('No obvious social engineering triggers detected. Keep standard email vigilance.');
  }

  return {
    riskScore: score,
    riskLevel,
    targetSummary: content.slice(0, 80).replace(/\n/g, ' ') + (content.length > 80 ? '...' : ''),
    threatIndicators: threatIndicators.length > 0 ? threatIndicators : ['Message text appears consistent with normal communication.'],
    recommendations,
    details: {
      type,
      lengthChars: content.length,
      embeddedLinksFound: extractedUrls.length,
      extractedLinks: extractedUrls.slice(0, 3),
    },
  };
}
