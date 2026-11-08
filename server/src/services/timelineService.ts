import { Types } from 'mongoose';
import { SecurityAuditLog } from '../models/SecurityAuditLog.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { ImpossibleTravelAlert } from '../models/ImpossibleTravelAlert.js';
import { AccountProtectionEvent } from '../models/AccountProtectionEvent.js';

export interface ITimelineItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'login' | 'security' | 'suspicious' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'warning' | 'danger' | 'info';
  location: string;
  device: string;
  ipAddress: string;
  actionRecommendation?: string;
  metadata?: Record<string, any>;
}

export async function getPersonalSecurityTimeline(
  userId: Types.ObjectId,
  options: {
    category?: string;
    search?: string;
    limit?: number;
    skip?: number;
  } = {}
) {
  const { category = 'all', search = '', limit = 50, skip = 0 } = options;

  const [audits, logins, travels, protections] = await Promise.all([
    SecurityAuditLog.find({ userId }).sort({ timestamp: -1 }).limit(100).lean(),
    LoginHistory.find({ userId }).sort({ loginTimestamp: -1 }).limit(100).lean(),
    ImpossibleTravelAlert.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
    AccountProtectionEvent.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  const items: ITimelineItem[] = [];

  // Map Audit Logs
  for (const a of audits) {
    let cat: 'login' | 'security' | 'suspicious' | 'recovery' = 'security';
    let sev: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let st: 'success' | 'warning' | 'danger' | 'info' = 'info';

    if (a.eventType === 'auth') {
      cat = 'login';
      st = a.action.toLowerCase().includes('failed') ? 'danger' : 'success';
      sev = a.action.toLowerCase().includes('failed') ? 'medium' : 'low';
    } else if (a.eventType === 'lock' || a.action.toLowerCase().includes('recover')) {
      cat = 'recovery';
      sev = 'critical';
      st = 'warning';
    } else if (a.eventType === 'security') {
      cat = 'security';
      sev = 'medium';
      st = 'success';
    }

    items.push({
      id: a._id.toString(),
      title: a.action,
      description: `Security event logged from ${a.ipAddress || 'Internal'} using ${a.browser || 'SecurePulse Client'}.`,
      timestamp: new Date(a.timestamp).toISOString(),
      category: cat,
      severity: sev,
      status: st,
      location: 'Verified System',
      device: a.browser || 'Web Client',
      ipAddress: a.ipAddress || 'Internal',
      metadata: a.relevantMetadata,
    });
  }

  // Map Logins
  for (const l of logins) {
    const isFail = l.loginStatus === 'failed';
    const isSusp = l.riskScore >= 50 || l.impossibleTravel?.detected;

    items.push({
      id: l._id.toString(),
      title: isFail
        ? `Failed Login Attempt (${l.failureReason || 'Invalid credentials'})`
        : `Successful Login (${l.browserName} on ${l.operatingSystem})`,
      description: `Authentication event at ${l.city || 'Unknown'}, ${l.country || 'Unknown'} from IP ${l.ipAddress}. Risk Score: ${l.riskScore}/100.`,
      timestamp: new Date(l.loginTimestamp).toISOString(),
      category: isSusp ? 'suspicious' : 'login',
      severity: l.riskScore >= 75 ? 'critical' : l.riskScore >= 50 ? 'high' : l.riskScore >= 30 ? 'medium' : 'low',
      status: isFail ? 'danger' : isSusp ? 'warning' : 'success',
      location: `${l.city || 'Unknown'}, ${l.country || 'Unknown'}`,
      device: `${l.deviceType} (${l.browserName})`,
      ipAddress: l.ipAddress,
      actionRecommendation: isFail ? 'If this was not you, change your password immediately' : undefined,
      metadata: { riskScore: l.riskScore, riskFactors: l.riskFactors },
    });
  }

  // Map Impossible Travels
  for (const t of travels) {
    items.push({
      id: t._id.toString(),
      title: `Impossible Travel Detected: ${t.fromCity} → ${t.toCity}`,
      description: `Implausible travel velocity of ${t.speedKmPerHour} km/h spanning ${t.distanceKm} km in ${t.timeDeltaMinutes} minutes.`,
      timestamp: new Date(t.createdAt).toISOString(),
      category: 'suspicious',
      severity: 'critical',
      status: 'danger',
      location: `${t.fromCity} → ${t.toCity}`,
      device: 'Geographical Anomaly',
      ipAddress: 'Multiple Networks',
      actionRecommendation: 'Review this session and consider enabling Emergency Freeze if not authorized',
      metadata: { speedKmPerHour: t.speedKmPerHour, distanceKm: t.distanceKm },
    });
  }

  // Map Account Protections
  for (const p of protections) {
    items.push({
      id: p._id.toString(),
      title: p.title,
      description: p.description,
      timestamp: new Date(p.createdAt).toISOString(),
      category: p.eventType.includes('recovery') ? 'recovery' : 'security',
      severity: p.riskLevel,
      status: p.riskLevel === 'critical' ? 'danger' : p.riskLevel === 'high' ? 'warning' : 'success',
      location: 'Account Management',
      device: p.browser || 'Web Client',
      ipAddress: p.ipAddress || 'Internal',
      actionRecommendation: p.actionRequired || undefined,
    });
  }

  // Deduplicate and Sort chronologically (newest first)
  const uniqueItems = Array.from(new Map(items.map((i) => [i.id + i.title, i])).values());
  uniqueItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filter by category
  let filtered = uniqueItems;
  if (category && category !== 'all') {
    filtered = filtered.filter((i) => i.category === category);
  }

  // Filter by search query
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.ipAddress.toLowerCase().includes(q) ||
        i.device.toLowerCase().includes(q)
    );
  }

  const paginated = filtered.slice(skip, skip + limit);

  return {
    items: paginated,
    total: filtered.length,
    counts: {
      all: uniqueItems.length,
      login: uniqueItems.filter((i) => i.category === 'login').length,
      security: uniqueItems.filter((i) => i.category === 'security').length,
      suspicious: uniqueItems.filter((i) => i.category === 'suspicious').length,
      recovery: uniqueItems.filter((i) => i.category === 'recovery').length,
    },
  };
}

/**
 * Generate CSV representation of user's personal security timeline
 */
export function generateTimelineCsv(items: ITimelineItem[]): string {
  const headers = ['Timestamp (UTC)', 'Category', 'Severity', 'Event Title', 'Description', 'Location', 'Device', 'IP Address'];
  const rows = items.map((i) => [
    `"${i.timestamp}"`,
    `"${i.category}"`,
    `"${i.severity}"`,
    `"${i.title.replace(/"/g, '""')}"`,
    `"${i.description.replace(/"/g, '""')}"`,
    `"${i.location.replace(/"/g, '""')}"`,
    `"${i.device.replace(/"/g, '""')}"`,
    `"${i.ipAddress}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

