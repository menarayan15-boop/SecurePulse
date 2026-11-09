import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { TravelPlan } from '../models/TravelPlan.js';

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

    // 2. Check for active plan
    let activePlan: any = null;
    const upcomingPlans: any[] = [];
    const pastPlans: any[] = [];

    for (const plan of plans) {
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);

      if (now >= start && now <= end && plan.isActive) {
        activePlan = plan;
      } else if (now < start && plan.isActive) {
        upcomingPlans.push(plan);
      } else {
        // Expired or inactive
        if (now > end && plan.isActive) {
          plan.isActive = false;
          await plan.save?.();
        }
        pastPlans.push(plan);
      }
    }

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
        message: 'Destination city, country, start date, and end date are required.',
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid start or end date format.' });
      return;
    }

    if (end < start) {
      res.status(400).json({ success: false, message: 'End date must be on or after the start date.' });
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
      if (now >= new Date(plan.startDate) && now <= new Date(plan.endDate)) {
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

