// Supervisor data access. Every function is async and returns the shapes in @/types/supervisor,
// so swapping the mock bodies for NestJS API calls later does not change any screen.
import {
  activities,
  dashboardStats,
  meetings,
  progressOverview,
  supervisorProfile,
} from "@/data/mock/supervisor";
import type {
  Activity,
  DashboardStat,
  Meeting,
  ProgressOverview,
  SupervisorDashboard,
  SupervisorProfile,
} from "@/types/supervisor";

/** Simulated network delay, so loading states are visible while on mock data. */
const MOCK_LATENCY_MS = 600;

function mockResponse<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), MOCK_LATENCY_MS));
}

export function getSupervisorProfile(): Promise<SupervisorProfile> {
  return mockResponse(supervisorProfile);
}

export function getDashboardStats(): Promise<DashboardStat[]> {
  return mockResponse(dashboardStats);
}

export function getProgressOverview(): Promise<ProgressOverview> {
  return mockResponse(progressOverview);
}

export function getUpcomingMeetings(): Promise<Meeting[]> {
  return mockResponse(meetings());
}

export function getRecentActivity(): Promise<Activity[]> {
  return mockResponse(activities());
}

export async function getSupervisorDashboard(): Promise<SupervisorDashboard> {
  const [profile, stats, progress, upcomingMeetings, recentActivity] = await Promise.all([
    getSupervisorProfile(),
    getDashboardStats(),
    getProgressOverview(),
    getUpcomingMeetings(),
    getRecentActivity(),
  ]);
  return { profile, stats, progress, meetings: upcomingMeetings, activities: recentActivity };
}
