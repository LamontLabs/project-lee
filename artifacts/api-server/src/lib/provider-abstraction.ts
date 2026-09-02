import { db, providerRegistration } from "@workspace/db";
import { eq } from "drizzle-orm";

export type StandardMessage = { id: string; threadId: string; sender: string; recipients: string[]; subject: string; snippet?: string; receivedAt: Date; hasAttachments: boolean; labels: string[] };
export type StandardThread = { id: string; subject: string; messages: StandardMessage[] };
export type StandardDocument = { id: string; title: string; provider: string; modifiedAt: Date; url?: string; content?: string };
export type StandardEvent = { id: string; title: string; startAt: Date; endAt: Date; attendees: string[]; location?: string; provider: string };
export type StandardCommit = { sha: string; repoId: string; author: string; message: string; timestamp: Date; filesChangedCount: number };
export type StandardIssue = { id: string; repoId: string; title: string; labels: string[]; assignees: string[]; openedAt: Date };
export type StandardPR = { id: string; repoId: string; title: string; author: string; targetBranch: string; openedAt: Date };
export type FileRef = { id: string; name: string; type: string; size?: number; folder?: string; provider: string; modifiedAt?: Date };
export type RepositoryFile = { path: string; size: number; lines: number; content?: string; contentExcluded?: boolean };
export type RepositorySnapshot = { repositoryId: string; root: string; files: RepositoryFile[] };

export interface CommunicationProvider {
  fetchMessages(since: Date): Promise<StandardMessage[]>; fetchThread(threadId: string): Promise<StandardThread>; listUnread(): Promise<StandardMessage[]>; markRead(messageId: string): Promise<void>;
}
export interface DocumentProvider { listDocuments(since: Date): Promise<StandardDocument[]>; getDocument(docId: string): Promise<StandardDocument>; watchChanges(callback: (document: StandardDocument) => void): Promise<() => void>; }
export interface DevelopmentProvider { listRepos(): Promise<{ id: string; name: string }[]>; fetchCommits(repoId: string, since: Date): Promise<StandardCommit[]>; fetchIssues(repoId: string, filters?: Record<string, unknown>): Promise<StandardIssue[]>; fetchPullRequests(repoId: string, filters?: Record<string, unknown>): Promise<StandardPR[]>; inspectRepository?(repositoryId: string): Promise<RepositorySnapshot>; }
export interface SchedulingProvider { listEvents(from: Date, to: Date): Promise<StandardEvent[]>; getEvent(eventId: string): Promise<StandardEvent>; watchChanges(callback: (event: StandardEvent) => void): Promise<() => void>; }
export interface StorageProvider { listFiles(folder?: string): Promise<FileRef[]>; getFile(fileId: string): Promise<unknown>; watchChanges(callback: (file: FileRef) => void): Promise<() => void>; }

import { executeConsequentialAction, type ConsequentialActionResult } from "./consequential-execution";

export type ProviderWriteInput<T> = {
  provider: string;
  actionType?: string;
  targetSystem?: string;
  payload: Record<string, unknown>;
  reason: string;
  evidenceRefs?: string[];
  actor?: string;
  ownerConfirmed: boolean;
  humanConfirmed: boolean;
  intent?: Record<string, unknown>;
  correlationId?: string;
  write: () => Promise<T> | T;
};

/** The only supported entry point for future provider-side mutations. */
export function executeProviderWrite<T>(input: ProviderWriteInput<T>): Promise<ConsequentialActionResult<T>> {
  return executeConsequentialAction({
    ...input,
    actionType: input.actionType ?? "connector_write",
    targetSystem: input.targetSystem ?? `provider:${input.provider}`,
    execute: input.write,
  });
}

export type ProviderCategory = "communication" | "document" | "development" | "scheduling" | "storage";
export type ProviderRegistration = { providerId: string; providerCategory: ProviderCategory; adapterName: string; currentStatus: "HEALTHY" | "DEGRADED" | "UNAVAILABLE"; supportedEvents: string[]; lastSyncedAt?: Date };
export const providerDefinitions: ProviderRegistration[] = [
  { providerId: "gmail", providerCategory: "communication", adapterName: "gmail", supportedEvents: ["EmailReceived", "ThreadUpdated", "EmailSentDetected", "WaitingLoopResolved"], currentStatus: "HEALTHY" },
  { providerId: "google_drive", providerCategory: "storage", adapterName: "google_drive", supportedEvents: ["FileCreated", "FileUpdated", "FileDeleted"], currentStatus: "HEALTHY" },
  { providerId: "google_calendar", providerCategory: "scheduling", adapterName: "google_calendar", supportedEvents: ["CalendarEventCreated", "CalendarEventUpdated", "CalendarEventCancelled", "TravelDetected", "MeetingWithPersonDetected"], currentStatus: "HEALTHY" },
  { providerId: "github", providerCategory: "development", adapterName: "github", supportedEvents: ["CommitPushed", "IssueOpened", "IssueResolved", "PROpened", "PRMerged", "BuildFailed", "RepoInactive"], currentStatus: "HEALTHY" },
];
export async function registerProviders() { for (const provider of providerDefinitions) await db.insert(providerRegistration).values({ ...provider }).onConflictDoUpdate({ target: providerRegistration.providerId, set: { providerCategory: provider.providerCategory, adapterName: provider.adapterName, supportedEvents: provider.supportedEvents, updatedAt: new Date() } }); return db.select().from(providerRegistration); }
export async function listProviders() { return db.select().from(providerRegistration); }