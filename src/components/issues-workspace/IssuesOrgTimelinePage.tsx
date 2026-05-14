'use client';

import {
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttHeader,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
  type GanttFeature,
  type GanttStatus,
} from '@/components/ui/shadcn-io/gantt';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { apiClient } from '@/lib/api-client';
import { EyeIcon, LinkIcon, TrashIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrg } from '@/components/providers/org-provider';
import { getDashboardPath } from '@/lib/subdomain';
import { getSelectedSiteIdFromStorage } from '@/lib/selected-site';
import groupBy from 'lodash.groupby';
import { addDays, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useTranslate } from '@/components/providers/translation-provider';

type Issue = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  deadline?: string | null;
  processId?: string | null;
};

function issueToFeature(
  issue: Issue,
  statusById: Record<string, GanttStatus>,
  t: (s: string) => string
): GanttFeature {
  const startAt = new Date(issue.createdAt);
  let endAt: Date;
  if (issue.deadline) {
    const d = new Date(issue.deadline);
    endAt = endOfDay(d);
  } else {
    endAt = addDays(startAt, 1);
  }
  const status = statusById[issue.status] ?? statusById['to-do'];
  return {
    id: issue.id,
    name: issue.title || t('Untitled'),
    startAt,
    endAt,
    status,
  };
}

export default function IssuesOrgTimelinePage() {
  const { orgId, slug: orgSlug } = useOrg();
  const { t } = useTranslate();
  const [siteId, setSiteId] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const statusById = useMemo<Record<string, GanttStatus>>(
    () => ({
      'to-do': { id: 'to-do', name: t('To Do'), color: '#6B7280' },
      'in-progress': { id: 'in-progress', name: t('In Progress'), color: '#F59E0B' },
      'in-review': { id: 'in-review', name: t('In Review'), color: '#8B5CF6' },
      done: { id: 'done', name: t('Done'), color: '#10B981' },
    }),
    [t]
  );

  useEffect(() => {
    if (!orgId) return;
    const read = () => setSiteId(getSelectedSiteIdFromStorage(orgId) || '');
    read();
    const onSite = () => read();
    window.addEventListener('siteChanged', onSite);
    return () => window.removeEventListener('siteChanged', onSite);
  }, [orgId]);

  const processByIssueId = useMemo(() => {
    const m: Record<string, string | undefined> = {};
    for (const i of issues) {
      m[i.id] = i.processId ?? undefined;
    }
    return m;
  }, [issues]);

  const fetchIssues = useCallback(async () => {
    if (!orgId || !siteId) {
      setIssues([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.getOrgIssues(orgId, { siteId });
      setIssues((res.issues ?? []) as Issue[]);
    } catch (err: unknown) {
      console.error('Failed to fetch issues:', err);
      toast.error(err instanceof Error ? err.message : t('Failed to load issues'));
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, siteId, t]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const shouldRefresh = useCallback(
    (detail: Record<string, unknown>) => {
      if (detail.orgId !== orgId) return false;
      if (!siteId) return false;
      if (detail.siteId != null && detail.siteId !== siteId) return false;
      return true;
    },
    [orgId, siteId]
  );

  useEffect(() => {
    const onCreated = (e: Event) => {
      const ev = e as CustomEvent;
      if (shouldRefresh(ev.detail || {})) fetchIssues();
    };
    const onUpdated = (e: Event) => {
      const ev = e as CustomEvent;
      const d = ev.detail || {};
      if (d.source === 'board') return;
      if (shouldRefresh(d)) fetchIssues();
    };
    window.addEventListener('issueCreated', onCreated);
    window.addEventListener('issueUpdated', onUpdated);
    return () => {
      window.removeEventListener('issueCreated', onCreated);
      window.removeEventListener('issueUpdated', onUpdated);
    };
  }, [fetchIssues, shouldRefresh]);

  const features = useMemo(
    () => issues.map((i) => issueToFeature(i, statusById, t)),
    [issues, statusById, t]
  );
  const groupedByStatus = useMemo(() => {
    const g = groupBy(features, (f) => f.status.id);
    return Object.fromEntries(Object.entries(g).sort(([a], [b]) => a.localeCompare(b)));
  }, [features]);

  const openIssueDialog = useCallback(
    (issueId: string) => {
      window.dispatchEvent(
        new CustomEvent('openIssueDialog', {
          detail: {
            issueId,
            orgId,
            processId: processByIssueId[issueId],
          },
        })
      );
    },
    [orgId, processByIssueId]
  );

  const handleCopyLink = useCallback(
    (issueId: string) => {
      const path = getDashboardPath(orgSlug, `issues/timeline`);
      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${path}?issueId=${issueId}`;
      navigator.clipboard.writeText(url).then(
        () => toast.success(t('Link copied')),
        () => toast.error(t('Failed to copy'))
      );
    },
    [orgSlug, t]
  );

  const handleRemove = useCallback(
    async (issueId: string) => {
      if (!orgId) return;
      try {
        await apiClient.deleteOrgIssue(orgId, issueId);
        toast.success(t('Issue removed'));
        fetchIssues();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t('Failed to remove issue'));
      }
    },
    [orgId, fetchIssues, t]
  );

  const handleAddItem = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('openIssueDialog', {
        detail: { orgId },
      })
    );
  }, [orgId]);

  if (!siteId) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        {t('Select a site in the sidebar to load the timeline.')}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        {t('Loading timeline...')}
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-2 text-muted-foreground">
        <p>{t('No issues to show on the timeline.')}</p>
        <p className="text-sm">{t('Create an issue to see it from created date to deadline.')}</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full">
      <GanttProvider className="border" onAddItem={handleAddItem} range="monthly" zoom={100}>
        <GanttSidebar>
          {Object.entries(groupedByStatus).map(([groupName, groupFeatures]) => (
            <GanttSidebarGroup key={groupName} name={statusById[groupName]?.name ?? groupName}>
              {groupFeatures.map((feature) => (
                <GanttSidebarItem
                  key={feature.id}
                  feature={feature}
                  onSelectItem={() => openIssueDialog(feature.id)}
                />
              ))}
            </GanttSidebarGroup>
          ))}
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            {Object.entries(groupedByStatus).map(([groupName, groupFeatures]) => (
              <GanttFeatureListGroup key={groupName}>
                {groupFeatures.map((feature) => (
                  <div className="flex" key={feature.id}>
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={() => openIssueDialog(feature.id)}
                          className="w-full text-left"
                        >
                          <GanttFeatureItem {...feature}>
                            <p className="flex-1 truncate text-xs">{feature.name}</p>
                          </GanttFeatureItem>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          className="flex items-center gap-2"
                          onClick={() => openIssueDialog(feature.id)}
                        >
                          <EyeIcon className="text-muted-foreground" size={16} />
                          {t('View issue')}
                        </ContextMenuItem>
                        <ContextMenuItem
                          className="flex items-center gap-2"
                          onClick={() => handleCopyLink(feature.id)}
                        >
                          <LinkIcon className="text-muted-foreground" size={16} />
                          {t('Copy link')}
                        </ContextMenuItem>
                        <ContextMenuItem
                          className="flex items-center gap-2 text-destructive"
                          onClick={() => handleRemove(feature.id)}
                        >
                          <TrashIcon size={16} />
                          {t('Remove from timeline')}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </div>
                ))}
              </GanttFeatureListGroup>
            ))}
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
}
