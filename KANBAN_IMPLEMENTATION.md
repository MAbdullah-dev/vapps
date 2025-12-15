# Performant Kanban Board Implementation - Technical Description

## Overview

This document describes the implementation of a high-performance Kanban board with optimistic updates, client-side update queuing, and efficient backend synchronization. The implementation minimizes perceived latency, prevents dropped requests, and ensures reliable status synchronization between the UI and PostgreSQL database.

## Architecture

### Core Principles

1. **Optimistic Updates**: UI updates immediately on drag-and-drop without waiting for backend response
2. **Update Queue**: All status changes are queued client-side before being sent to the backend
3. **Batching & Debouncing**: Updates are batched together and debounced to reduce API calls
4. **Race Condition Prevention**: Only one update per issue is processed at a time
5. **Graceful Rollback**: Failed updates automatically revert to previous status
6. **Non-Blocking**: Failed updates don't prevent further interactions

## Implementation Details

### 1. Update Queue System

**Data Structure:**
```typescript
updateQueueRef: Map<issueId, QueuedUpdate>
```

- Uses a `Map` to store pending updates keyed by issue ID
- Each entry contains: `issueId`, `newStatus`, `previousStatus`, `timestamp`
- Automatically replaces older updates for the same issue (only latest status matters)

**Important:** The update queue exists entirely on the client and is flushed to the backend asynchronously; the backend does not maintain queue state.

**Key Features:**
- **Deduplication**: If a user drags the same issue multiple times rapidly, only the final status is queued
- **Per-Issue Tracking**: Each issue can only have one pending update at a time
- **Timestamp Tracking**: Helps with debugging and potential retry logic

### 2. Optimistic UI Updates

**Flow:**
1. User drags a card → `handleDataChange` is called immediately
2. UI updates instantly (optimistic update)
3. Status change is detected and queued
4. User sees immediate feedback without waiting for backend

**Implementation:**
```typescript
const handleDataChange = useCallback((updatedData: any[]) => {
  // Update UI immediately
  const updatedIssues = updatedData.map((item) => {
    // ... update status optimistically
    if (oldStatus !== newStatus) {
      queueUpdate(item.id, newStatus, oldStatus); // Queue for backend
    }
  });
  setIssues(updatedIssues);
}, [queueUpdate]);
```

### 3. Debounced Batch Processing

**Debouncing Strategy:**
- **Delay**: 300ms after the last update before processing
- **Purpose**: Batches multiple rapid drags into fewer API calls
- **Example**: User drags 5 issues quickly → All 5 updates batched into one processing cycle

**Implementation:**
```typescript
const scheduleQueueProcessing = useCallback(() => {
  if (processTimeoutRef.current) {
    clearTimeout(processTimeoutRef.current); // Reset timer
  }
  processTimeoutRef.current = setTimeout(() => {
    processUpdateQueue(); // Process all queued updates
  }, 300);
}, [processUpdateQueue]);
```

### 4. Sequential Update Processing

**Race Condition Prevention:**
- Updates are processed **sequentially** (one at a time)
- Uses `isProcessingRef` flag to prevent concurrent processing
- Each update waits for the previous one to complete

**Implementation:**
```typescript
const processUpdateQueue = useCallback(async () => {
  if (isProcessingRef.current) return; // Prevent concurrent processing
  
  isProcessingRef.current = true;
  const queue = new Map(updateQueueRef.current);
  updateQueueRef.current.clear();
  
  // Process sequentially
  for (const update of updates) {
    await apiClient.updateIssue(...); // Wait for each to complete
  }
  
  isProcessingRef.current = false;
}, []);
```

### 5. Graceful Error Handling & Rollback

**Failure Detection:**
- Failed updates are tracked in `failedUpdatesRef` Set
- Prevents queuing new updates for failed issues until resolved

**Rollback Mechanism:**
```typescript
catch (error) {
  // Guard: If a newer optimistic update exists for the same issue, skip rollback
  // to avoid reverting valid state (handles edge cases when users drag fast)
  const currentIssue = issuesRef.current.find((i) => i.id === update.issueId);
  const hasNewerUpdate = currentIssue && currentIssue.status !== update.newStatus;
  
  if (!hasNewerUpdate) {
    // Revert UI to previous status
    setIssues((prevIssues) =>
      prevIssues.map((issue) =>
        issue.id === update.issueId
          ? { ...issue, status: update.previousStatus }
          : issue
      )
    );
  }
  toast.error('Failed to update issue status');
}
```

**Features:**
- **Automatic Rollback**: UI reverts to previous status on failure
- **User Notification**: Toast message informs user of failure
- **Non-Blocking**: User can continue interacting with other issues
- **Failed Issue Protection**: Prevents queuing new updates for failed issues

### 6. State Management with Refs

**Why Refs Instead of State?**

1. **Avoid Stale Closures**: Refs always have the latest value
2. **No Re-renders**: Updating refs doesn't trigger component re-renders
3. **Performance**: Faster than state updates for frequently changing data
4. **Queue Management**: Perfect for managing update queues

**Refs Used:**
- `updateQueueRef`: Stores pending updates
- `isProcessingRef`: Prevents concurrent processing
- `issuesRef`: Keeps latest issues for optimistic updates
- `failedUpdatesRef`: Tracks failed updates
- `processTimeoutRef`: Manages debounce timer

### 7. Lightweight Backend API

**API Design:**
- **Single Issue Update**: Only updates the specific issue, not entire board
- **Idempotent**: Safe to retry if needed
- **Indexed**: Database has indexes on `id` and `status` for performance
- **No Refetch**: Backend doesn't return full board data
- **Transaction Scope**: Each update uses a single-row UPDATE query without wrapping in unnecessary transactions to minimize RDS latency

**API Call:**
```typescript
await apiClient.updateIssue(orgId, processId, issueId, {
  status: newStatus,
});
```

## Performance Optimizations

### 1. Batching
- Multiple rapid drags are batched into fewer API calls
- Reduces database load and network overhead
- Example: 5 rapid drags → 1 batch of 5 API calls

### 2. Debouncing
- 300ms delay prevents excessive API calls
- User can drag multiple issues quickly without overwhelming backend
- Balances responsiveness with efficiency

### 3. Deduplication
- Only latest status for each issue is queued
- Prevents redundant API calls for same issue
- Example: Drag issue A 3 times → Only 1 update queued (final status)

### 4. Sequential Processing
- Prevents race conditions
- Ensures database consistency
- One update completes before next starts

### 5. Optimistic Updates
- Zero perceived latency for UI updates
- User sees immediate feedback
- Backend sync happens asynchronously

## User Experience Flow

### Successful Update Flow:
1. User drags card from "To Do" → "In Progress"
2. **UI updates instantly** (optimistic)
3. Update queued: `{ issueId: '123', newStatus: 'in-progress', previousStatus: 'to-do' }`
4. After 300ms debounce, API call made
5. Backend updates PostgreSQL
6. Success - UI already correct, no refresh needed

### Rapid Drags Flow (5 issues):
1. User drags 5 issues quickly
2. **All 5 UI updates instantly** (optimistic)
3. All 5 updates queued
4. After 300ms debounce, all 5 API calls processed sequentially
5. All succeed - UI already correct

### Failed Update Flow:
1. User drags card
2. **UI updates instantly** (optimistic)
3. Update queued
4. API call fails (network error, etc.)
5. **UI automatically reverts** to previous status
6. Toast notification shown
7. User can retry or continue with other issues

## Database Considerations

### Indexing
- **Primary Key**: `id` (already indexed)
- **Status Column**: Indexed for fast filtering
- **Process ID**: Indexed for tenant isolation

### Query Performance
- Single-row UPDATE queries (very fast)
- No JOINs or complex queries
- No full table scans
- Indexed lookups only

### Idempotency
- Updates are idempotent (safe to retry)
- Same status update multiple times = same result
- No side effects from duplicate calls

## Error Scenarios & Handling

### 1. Network Failure
- **Detection**: API call throws error
- **Action**: Rollback UI, show toast, prevent further updates for that issue
- **User Impact**: Issue reverts, can retry

### 2. Concurrent Updates
- **Prevention**: Sequential processing, per-issue locking
- **Action**: Queue replaces older updates
- **User Impact**: None - latest status wins

### 3. Rapid Drags
- **Handling**: Batching and debouncing
- **Action**: Multiple updates batched together
- **User Impact**: Smooth experience, no dropped updates

### 4. Backend Validation Failure
- **Detection**: API returns error response
- **Action**: Rollback UI, show error message
- **User Impact**: Issue reverts, user notified

## Monitoring & Debugging

### Console Logs
- `[UpdateQueue] Queued update` - When update is queued
- `[UpdateQueue] Processing X update(s)` - When batch processing starts
- `[UpdateQueue] ✅ Updated issue` - Successful update
- `[UpdateQueue] ❌ Failed to update issue` - Failed update

### Metrics to Track
- Queue size over time
- Processing time per batch
- Failure rate
- Average updates per batch

## Future Enhancements

### Potential Improvements:
1. **Retry Logic**: Automatic retry for failed updates with exponential backoff
2. **Offline Support**: Queue updates when offline, sync when online
3. **Conflict Resolution**: Handle concurrent updates from multiple users
4. **Batch API Endpoint**: Send multiple updates in single API call
5. **WebSocket Sync**: Real-time updates for multi-user scenarios
6. **Update History**: Track update history for audit trail

## Summary

This implementation provides:
- ✅ **Zero perceived latency** - Instant UI updates
- ✅ **Efficient backend sync** - Batched, debounced updates
- ✅ **Race condition prevention** - Sequential processing
- ✅ **Graceful error handling** - Automatic rollback
- ✅ **Scalable architecture** - Handles rapid interactions
- ✅ **Database optimized** - Lightweight, indexed queries
- ✅ **User-friendly** - Smooth, responsive experience

The Kanban board now handles rapid drag-and-drop interactions efficiently while maintaining data consistency and providing excellent user experience.
