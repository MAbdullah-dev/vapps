import type { PoolClient } from "pg";
import { fetchOrgWideActivityFeed, type OrgActivityFeedItem } from "@/lib/fetch-org-wide-activity-feed";
import {
  buildNotificationFilterContext,
  filterActivitiesForUser,
} from "@/lib/filter-notifications-for-user";

/**
 * Loads recent activities and returns only those relevant to `userId`
 * (document reviewers/approvers, issue assignees, audit stakeholders, etc.).
 */
export async function fetchUserNotificationFeed(
  client: PoolClient,
  userId: string,
  limit: number
): Promise<OrgActivityFeedItem[]> {
  const cap = Math.min(Math.max(limit, 1), 50);
  // Fetch extra rows because most org-wide events are filtered out per user.
  const fetchLimit = Math.min(cap * 5, 100);
  const activities = await fetchOrgWideActivityFeed(client, fetchLimit);
  const ctx = await buildNotificationFilterContext(client, activities);
  const filtered = filterActivitiesForUser(activities, userId, ctx);
  return filtered.slice(0, cap);
}
