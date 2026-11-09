import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import {
  analyzeUrlSafety,
  analyzeContentSafety,
} from '../services/phishingDetectorService.js';
import { PhishingScan } from '../models/PhishingScan.js';

/**
 * POST /api/phishing/scan-url
 * Analyzes a URL offline for phishing, homoglyphs, brand spoofing, and malicious TLDs.
 */
export async function scanUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { url } = req.body;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Please provide a valid URL to analyze.' });
      return;
    }

    if (url.length > 2000) {
      res.status(400).json({ success: false, message: 'URL string is too long (maximum 2000 characters).' });
      return;
    }

    // Run offline heuristic analysis (SSRF-safe, zero remote outbound request)
    const result = analyzeUrlSafety(url);

    // Save scan record
    if (userId) {
      try {
        await PhishingScan.create({
          userId,
          scanType: 'url',
          targetSummary: result.targetSummary,
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          threatIndicators: result.threatIndicators,
          recommendations: result.recommendations,
          details: result.details,
        });
      } catch (saveErr) {
        console.warn('[PHISHING_SCAN_SAVE_WARNING]:', saveErr);
      }
    }

    res.status(200).json({
      success: true,
      analysis: result,
    });
  } catch (err: any) {
    console.error('[PHISHING_URL_SCAN_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Phishing scanner encountered an error.' });
  }
}

/**
 * POST /api/phishing/scan-content
 * Inspects raw email or SMS text for social engineering, urgency, and credential harvesting.
 */
export async function scanContent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { content, type = 'email' } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Please provide text content to inspect.' });
      return;
    }

    if (content.length > 10000) {
      res.status(400).json({ success: false, message: 'Content exceeds 10,000 character limit.' });
      return;
    }

    const contentType = type === 'message' ? 'message' : 'email';
    const result = analyzeContentSafety(content, contentType);

    // Save scan record
    if (userId) {
      try {
        await PhishingScan.create({
          userId,
          scanType: contentType,
          targetSummary: result.targetSummary,
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          threatIndicators: result.threatIndicators,
          recommendations: result.recommendations,
          details: result.details,
        });
      } catch (saveErr) {
        console.warn('[PHISHING_SCAN_SAVE_WARNING]:', saveErr);
      }
    }

    res.status(200).json({
      success: true,
      analysis: result,
    });
  } catch (err: any) {
    console.error('[PHISHING_CONTENT_SCAN_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Content scanner encountered an error.' });
  }
}

/**
 * GET /api/phishing/history
 * Fetches recent scan history for the authenticated user.
 */
export async function getScanHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const scans = await PhishingScan.find({ userId }).sort({ createdAt: -1 }).limit(20);

    res.status(200).json({
      success: true,
      scans,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve scan history.' });
  }
}

