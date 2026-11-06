import { Request } from 'express';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import { ILoginEnvironment } from '../types/index.js';

export function extractEnvironmentInfo(req: Request): ILoginEnvironment {
  const userAgentString = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  // Extract IP
  // When running behind trusted proxies: req.headers['x-forwarded-for'], req.socket.remoteAddress
  let ip = (
    (req.headers['x-forwarded-for'] as string) ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  )
    .split(',')[0]
    .trim();

  // Clean IPv6 mapped IPv4 address e.g. ::ffff:127.0.0.1
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Device type detection
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  const uaDeviceType = result.device.type;
  if (uaDeviceType === 'mobile') {
    deviceType = 'mobile';
  } else if (uaDeviceType === 'tablet') {
    deviceType = 'tablet';
  } else if (!uaDeviceType && /Mobile|Android|iPhone|iPod/i.test(userAgentString)) {
    deviceType = 'mobile';
  } else if (!uaDeviceType && /iPad/i.test(userAgentString)) {
    deviceType = 'tablet';
  } else if (!uaDeviceType) {
    deviceType = 'desktop';
  }

  // Geolocation lookup
  let city = 'Local Environment';
  let state = 'Development';
  let country = 'India';
  let lat = 28.6139; // Default New Delhi for demo local environment
  let lng = 77.2090;

  const isLocalhost =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.');

  if (!isLocalhost) {
    const geo = geoip.lookup(ip);
    if (geo) {
      city = geo.city || 'Unknown City';
      state = geo.region || 'Unknown State';
      country = geo.country || 'Unknown Country';
      if (geo.ll && geo.ll.length >= 2) {
        lat = Number(geo.ll[0].toFixed(4));
        lng = Number(geo.ll[1].toFixed(4));
      }
    } else {
      city = 'Undetected City';
      state = 'Undetected Region';
      country = 'International';
    }
  } else {
    // Check if client provided custom simulated header for demonstration or testing of multi-location/new device
    if (req.headers['x-client-city']) {
      city = String(req.headers['x-client-city']);
    }
    if (req.headers['x-client-state']) {
      state = String(req.headers['x-client-state']);
    }
    if (req.headers['x-client-country']) {
      country = String(req.headers['x-client-country']);
    }
    if (req.headers['x-client-lat'] && req.headers['x-client-lng']) {
      lat = parseFloat(String(req.headers['x-client-lat'])) || lat;
      lng = parseFloat(String(req.headers['x-client-lng'])) || lng;
    }
  }

  return {
    ipAddress: ip,
    browserName: result.browser.name || 'Modern Browser',
    browserVersion: result.browser.version || '',
    browserEngine: result.engine.name || '',
    operatingSystem: `${result.os.name || 'Unknown OS'} ${result.os.version || ''}`.trim(),
    deviceType,
    deviceModel: result.device.model || undefined,
    deviceVendor: result.device.vendor || undefined,
    city,
    state,
    country,
    approximateCoordinates: {
      lat,
      lng,
    },
    userAgent: userAgentString,
  };
}
