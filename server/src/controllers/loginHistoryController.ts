import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { LoginHistory } from '../models/LoginHistory.js';

export async function getLoginHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, deviceType, browser, search, startDate, endDate } = req.query;

    const filter: Record<string, any> = { userId };

    if (status && status !== 'all') {
      filter.loginStatus = status;
    }

    if (deviceType && deviceType !== 'all') {
      filter.deviceType = deviceType;
    }

    if (browser && browser !== 'all') {
      filter.browserName = new RegExp(String(browser), 'i');
    }

    if (search && String(search).trim()) {
      const s = String(search).trim();
      filter.$or = [
        { ipAddress: new RegExp(s, 'i') },
        { city: new RegExp(s, 'i') },
        { country: new RegExp(s, 'i') },
        { browserName: new RegExp(s, 'i') },
        { operatingSystem: new RegExp(s, 'i') },
      ];
    }

    if (startDate || endDate) {
      filter.loginTimestamp = {};
      if (startDate) {
        filter.loginTimestamp.$gte = new Date(String(startDate));
      }
      if (endDate) {
        filter.loginTimestamp.$lte = new Date(String(endDate));
      }
    }

    const [total, records] = await Promise.all([
      LoginHistory.countDocuments(filter),
      LoginHistory.find(filter)
        .sort({ loginTimestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve login activity.' });
  }
}

export async function getLoginHistoryById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const record = await LoginHistory.findOne({ _id: id, userId: req.userId }).lean();

    if (!record) {
      res.status(404).json({ success: false, message: 'Login event record not found.' });
      return;
    }

    res.status(200).json({ success: true, data: record });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve record detail.' });
  }
}

export async function exportLoginHistoryCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const records = await LoginHistory.find({ userId })
      .sort({ loginTimestamp: -1 })
      .limit(1000)
      .lean();

    const headers = [
      'Timestamp (UTC)',
      'Status',
      'IP Address',
      'Browser',
      'Browser Version',
      'Operating System',
      'Device Type',
      'City',
      'State',
      'Country',
      'Latitude',
      'Longitude',
      'OTP Status',
      'Risk Score',
      'Risk Factors',
      'New Device',
      'Trusted Device',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map((r: any) => [
      escapeCsv(r.loginTimestamp ? new Date(r.loginTimestamp).toISOString() : ''),
      escapeCsv(r.loginStatus),
      escapeCsv(r.ipAddress),
      escapeCsv(r.browserName),
      escapeCsv(r.browserVersion),
      escapeCsv(r.operatingSystem),
      escapeCsv(r.deviceType),
      escapeCsv(r.city),
      escapeCsv(r.state),
      escapeCsv(r.country),
      escapeCsv(r.approximateCoordinates?.lat ?? ''),
      escapeCsv(r.approximateCoordinates?.lng ?? ''),
      escapeCsv(r.otpStatus),
      escapeCsv(r.riskScore),
      escapeCsv(r.riskFactors?.join('; ') || ''),
      escapeCsv(r.isNewDevice ? 'Yes' : 'No'),
      escapeCsv(r.isTrustedDevice ? 'Yes' : 'No'),
    ]);

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows.map((row: any) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="securepulse-login-history-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to export login activity CSV.' });
  }
}
