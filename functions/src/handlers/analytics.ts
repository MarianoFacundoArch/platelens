import { Request, Response } from 'express';
import { firestore } from '../lib/firebase';
import type { LogDoc } from '../shared/types/firestore';

function formatDateISO(date: Date) {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate analytics for a given time period
 * GET /v1/analytics/trends?uid={uid}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
 */
export async function getTrends(req: Request, res: Response) {
  try {
    const uid = req.query.uid as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Fetch all logs in the date range
    const snapshot = await firestore
      .collection('logs')
      .where('uid', '==', uid)
      .where('dateISO', '>=', startDate)
      .where('dateISO', '<=', endDate)
      .orderBy('dateISO')
      .get();

    // Aggregate by day
    const dayTotals: Record<
      string,
      { calories: number; p: number; c: number; f: number; logCount: number }
    > = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as LogDoc;
      const key = data.dateISO;
      const existing = dayTotals[key] || { calories: 0, p: 0, c: 0, f: 0, logCount: 0 };
      dayTotals[key] = {
        calories: existing.calories + (data.totalCalories ?? 0),
        p: existing.p + (data.macros?.p ?? 0),
        c: existing.c + (data.macros?.c ?? 0),
        f: existing.f + (data.macros?.f ?? 0),
        logCount: existing.logCount + 1,
      };
    });

    // Calculate averages
    const days = Object.keys(dayTotals);
    const daysWithData = days.filter((d) => dayTotals[d].logCount > 0);

    let avgCalories = 0;
    let avgProtein = 0;
    let avgCarbs = 0;
    let avgFat = 0;

    if (daysWithData.length > 0) {
      avgCalories = daysWithData.reduce((acc, d) => acc + dayTotals[d].calories, 0) / daysWithData.length;
      avgProtein = daysWithData.reduce((acc, d) => acc + dayTotals[d].p, 0) / daysWithData.length;
      avgCarbs = daysWithData.reduce((acc, d) => acc + dayTotals[d].c, 0) / daysWithData.length;
      avgFat = daysWithData.reduce((acc, d) => acc + dayTotals[d].f, 0) / daysWithData.length;
    }

    // Calculate trends (compare first half vs second half)
    let caloriesTrend = 0;
    let proteinTrend = 0;

    if (daysWithData.length >= 2) {
      const midpoint = Math.floor(daysWithData.length / 2);
      const firstHalf = daysWithData.slice(0, midpoint);
      const secondHalf = daysWithData.slice(midpoint);

      const avgCaloriesFirst = firstHalf.reduce((acc, d) => acc + dayTotals[d].calories, 0) / firstHalf.length;
      const avgCaloriesSecond = secondHalf.reduce((acc, d) => acc + dayTotals[d].calories, 0) / secondHalf.length;

      const avgProteinFirst = firstHalf.reduce((acc, d) => acc + dayTotals[d].p, 0) / firstHalf.length;
      const avgProteinSecond = secondHalf.reduce((acc, d) => acc + dayTotals[d].p, 0) / secondHalf.length;

      if (avgCaloriesFirst !== 0) {
        caloriesTrend = ((avgCaloriesSecond - avgCaloriesFirst) / avgCaloriesFirst) * 100;
      }

      if (avgProteinFirst !== 0) {
        proteinTrend = ((avgProteinSecond - avgProteinFirst) / avgProteinFirst) * 100;
      }
    }

    return res.json({
      period: {
        startDate,
        endDate,
        daysTotal: days.length,
        daysWithData: daysWithData.length,
      },
      averages: {
        calories: Math.round(avgCalories),
        protein: Math.round(avgProtein),
        carbs: Math.round(avgCarbs),
        fat: Math.round(avgFat),
      },
      trends: {
        calories: Math.round(caloriesTrend),
        protein: Math.round(proteinTrend),
      },
    });
  } catch (error) {
    console.error('get-trends-handler', error);
    return res.status(500).json({ error: 'Failed to get trends' });
  }
}

/**
 * Calculate streak information
 * GET /v1/analytics/streaks?uid={uid}
 */
export async function getStreaks(req: Request, res: Response) {
  try {
    const uid = req.query.uid as string | undefined;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    // Get user's current streak from user document
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();

    let currentStreak = 0;
    let lastLogDate = null;

    if (userDoc.exists) {
      const userData = userDoc.data();
      currentStreak = userData?.streakCount || 0;
      lastLogDate = userData?.lastLogDate || null;
    }

    // Calculate longest streak by fetching all logs
    const today = formatDateISO(new Date());
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoISO = formatDateISO(oneYearAgo);

    const snapshot = await firestore
      .collection('logs')
      .where('uid', '==', uid)
      .where('dateISO', '>=', oneYearAgoISO)
      .where('dateISO', '<=', today)
      .orderBy('dateISO')
      .get();

    // Get unique days with logs
    const uniqueDays = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as LogDoc;
      uniqueDays.add(data.dateISO);
    });

    const sortedDays = Array.from(uniqueDays).sort();

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate: Date | null = null;

    sortedDays.forEach((dateStr) => {
      const currentDate = new Date(dateStr);

      if (previousDate === null) {
        tempStreak = 1;
      } else {
        const dayDiff = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }

      previousDate = currentDate;
    });

    longestStreak = Math.max(longestStreak, tempStreak);

    return res.json({
      currentStreak,
      longestStreak,
      lastLogDate,
      totalDaysLogged: uniqueDays.size,
    });
  } catch (error) {
    console.error('get-streaks-handler', error);
    return res.status(500).json({ error: 'Failed to get streaks' });
  }
}

/**
 * Get monthly summary statistics
 * GET /v1/analytics/monthly?uid={uid}&year={YYYY}&month={M}
 */
export async function getMonthlySummary(req: Request, res: Response) {
  try {
    const uid = req.query.uid as string | undefined;
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string) - 1; // 0-indexed

    if (!uid || isNaN(year) || isNaN(month)) {
      return res.status(400).json({ error: 'uid, year, and month are required' });
    }

    // Calculate month boundaries
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = formatDateISO(firstDay);
    const endDate = formatDateISO(lastDay);

    // Fetch all logs for the month
    const snapshot = await firestore
      .collection('logs')
      .where('uid', '==', uid)
      .where('dateISO', '>=', startDate)
      .where('dateISO', '<=', endDate)
      .orderBy('dateISO')
      .get();

    // Aggregate by day
    const dayTotals: Record<
      string,
      { calories: number; p: number; c: number; f: number; logCount: number }
    > = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as LogDoc;
      const key = data.dateISO;
      const existing = dayTotals[key] || { calories: 0, p: 0, c: 0, f: 0, logCount: 0 };
      dayTotals[key] = {
        calories: existing.calories + (data.totalCalories ?? 0),
        p: existing.p + (data.macros?.p ?? 0),
        c: existing.c + (data.macros?.c ?? 0),
        f: existing.f + (data.macros?.f ?? 0),
        logCount: existing.logCount + 1,
      };
    });

    const daysWithData = Object.keys(dayTotals).filter((d) => dayTotals[d].logCount > 0);

    let avgCalories = 0;
    let avgProtein = 0;
    let totalMeals = 0;

    if (daysWithData.length > 0) {
      avgCalories = daysWithData.reduce((acc, d) => acc + dayTotals[d].calories, 0) / daysWithData.length;
      avgProtein = daysWithData.reduce((acc, d) => acc + dayTotals[d].p, 0) / daysWithData.length;
      totalMeals = daysWithData.reduce((acc, d) => acc + dayTotals[d].logCount, 0);
    }

    return res.json({
      year,
      month: month + 1, // Return 1-indexed
      daysInMonth: lastDay.getDate(),
      daysLogged: daysWithData.length,
      totalMeals,
      averages: {
        calories: Math.round(avgCalories),
        protein: Math.round(avgProtein),
      },
    });
  } catch (error) {
    console.error('get-monthly-summary-handler', error);
    return res.status(500).json({ error: 'Failed to get monthly summary' });
  }
}
