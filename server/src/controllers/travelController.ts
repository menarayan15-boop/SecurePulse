import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { TravelPlan } from '../models/TravelPlan.js';
import { LoginHistory } from '../models/LoginHistory.js';

/**
 * GET /api/travel/status
 * Retrieves active, upcoming, and past travel plans for authenticated user.
 * Automatically deactivates plans whose endDate has passed.
 */
export async function getTravelStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const now = new Date();

    // 1. Fetch all travel plans for user
    const plans = await TravelPlan.find({ userId }).sort({ startDate: 1 });

    // 2. Classify into active, upcoming, and past
    let activePlan: any = null;
    const upcomingPlans: any[] = [];
    const pastPlans: any[] = [];

    for (const plan of plans) {
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);

      // End of the day for endDate
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);

      if (now >= start && now <= endOfDay && plan.isActive) {
        activePlan = plan;
      } else if (now < start && plan.isActive) {
        upcomingPlans.push(plan);
      } else {
        // Expired or inactive
        if (now > endOfDay && plan.isActive) {
          plan.isActive = false;
          await plan.save?.();
        }
        pastPlans.push(plan);
      }
    }

    // Sort upcoming by start date ascending
    upcomingPlans.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    // Sort past by end date descending (most recent first)
    pastPlans.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    res.status(200).json({
      success: true,
      travelModeEnabled: Boolean(activePlan),
      activePlan,
      upcomingPlans,
      pastPlans,
      policyNotice:
        'Smart Travel Mode informs SecurePulse of your intended itinerary to reduce false-positive geographic warnings. Authentication, password verification, and high-risk OTP safeguards remain 100% active at all times.',
    });
  } catch (err: any) {
    console.error('[TRAVEL_STATUS_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve travel status.' });
  }
}

/**
 * GET /api/travel/plan/:id
 * Retrieves a single travel plan with real matching login history.
 */
export async function getTravelPlanDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const plan = await TravelPlan.findOne({ _id: id, userId });
    if (!plan) {
      res.status(404).json({ success: false, message: 'Travel plan not found or unauthorized.' });
      return;
    }

    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    const windowStart = new Date(start);
    windowStart.setDate(windowStart.getDate() - 1);
    const windowEnd = new Date(end);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const relatedLogins = await LoginHistory.find({
      userId,
      $or: [
        {
          loginTimestamp: { $gte: windowStart, $lte: windowEnd },
        },
        {
          country: new RegExp(plan.destinationCountry, 'i'),
        },
      ],
    }).sort({ loginTimestamp: -1 }).limit(10);

    const sanitizedLogins = relatedLogins.map((l: any) => ({
      _id: l._id,
      timestamp: l.loginTimestamp,
      city: l.city,
      country: l.country,
      ipAddress: l.ipAddress,
      browser: l.browserName,
      os: l.operatingSystem,
      status: l.loginStatus,
      riskScore: l.riskScore,
    }));

    res.status(200).json({
      success: true,
      plan,
      relatedLogins: sanitizedLogins,
    });
  } catch (err: any) {
    console.error('[GET_TRAVEL_PLAN_DETAILS_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve travel plan details.' });
  }
}

/**
 * POST /api/travel/plan
 * Creates a new travel itinerary plan.
 */
export async function createTravelPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { destinationCity, destinationCountry, startDate, endDate, purpose, notes } = req.body;

    if (!destinationCity || !destinationCountry || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Destination city, country, departure date, and return date are required.',
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid start or return date format.' });
      return;
    }

    if (end < start) {
      res.status(400).json({ success: false, message: 'Return date must be on or after the departure date.' });
      return;
    }

    // Check for duplicate identical plan to prevent accidental double submissions
    const existingDuplicate = await TravelPlan.findOne({
      userId,
      destinationCity: destinationCity.trim(),
      destinationCountry: destinationCountry.trim(),
      startDate: start,
      endDate: end,
    });

    if (existingDuplicate) {
      res.status(409).json({
        success: false,
        message: 'An identical travel itinerary already exists for these dates.',
        plan: existingDuplicate,
      });
      return;
    }

    const newPlan = await TravelPlan.create({
      userId,
      destinationCity: destinationCity.trim(),
      destinationCountry: destinationCountry.trim(),
      startDate: start,
      endDate: end,
      purpose: purpose ? String(purpose).trim() : 'Business / Personal Travel',
      notes: notes ? String(notes).trim() : '',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Travel plan created successfully. SecurePulse will adapt geographic monitoring during your trip.',
      plan: newPlan,
    });
  } catch (err: any) {
    console.error('[CREATE_TRAVEL_PLAN_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Failed to create travel plan.' });
  }
}

/**
 * PUT /api/travel/plan/:id
 * Updates an existing travel itinerary plan.
 */
export async function updateTravelPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { destinationCity, destinationCountry, startDate, endDate, purpose, notes } = req.body;

    const plan = await TravelPlan.findOne({ _id: id, userId });
    if (!plan) {
      res.status(404).json({ success: false, message: 'Travel plan not found or unauthorized.' });
      return;
    }

    if (!destinationCity || !destinationCountry || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Destination city, country, departure date, and return date are required.',
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid start or return date format.' });
      return;
    }

    if (end < start) {
      res.status(400).json({ success: false, message: 'Return date must be on or after the departure date.' });
      return;
    }

    const now = new Date();
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    plan.destinationCity = destinationCity.trim();
    plan.destinationCountry = destinationCountry.trim();
    plan.startDate = start;
    plan.endDate = end;
    if (purpose !== undefined) plan.purpose = String(purpose).trim();
    if (notes !== undefined) plan.notes = String(notes).trim();
    plan.isActive = now <= endOfDay;

    await plan.save?.();

    res.status(200).json({
      success: true,
      message: 'Travel plan updated successfully.',
      plan,
    });
  } catch (err: any) {
    console.error('[UPDATE_TRAVEL_PLAN_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Failed to update travel plan.' });
  }
}

/**
 * DELETE /api/travel/plan/:id
 * Cancels or deletes a travel plan.
 */
export async function deleteTravelPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const plan = await TravelPlan.findOne({ _id: id, userId });
    if (!plan) {
      res.status(404).json({ success: false, message: 'Travel plan not found or unauthorized.' });
      return;
    }

    await TravelPlan.deleteOne ? await TravelPlan.deleteOne({ _id: id }) : null;

    res.status(200).json({
      success: true,
      message: 'Travel plan removed successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete travel plan.' });
  }
}

/**
 * PUT /api/travel/toggle
 * Manually toggle active travel status.
 */
export async function toggleTravelMode(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { enabled } = req.body;

    const plans = await TravelPlan.find({ userId });
    const now = new Date();

    for (const plan of plans) {
      const endOfDay = new Date(plan.endDate);
      endOfDay.setHours(23, 59, 59, 999);

      if (now >= new Date(plan.startDate) && now <= endOfDay) {
        plan.isActive = Boolean(enabled);
        await plan.save?.();
      }
    }

    res.status(200).json({
      success: true,
      travelModeEnabled: Boolean(enabled),
      message: enabled
        ? 'Travel mode enabled for current itinerary.'
        : 'Travel mode paused.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to toggle travel mode.' });
  }
}
