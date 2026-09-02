export const connectorProviders = [
  "gmail",
  "proton",
  "github",
  "google_drive",
  "google_calendar",
  "replit",
] as const;

export type ConnectorProvider = (typeof connectorProviders)[number];

export type IncomingConnectorEvent = {
  externalId: string;
  eventType: string;
  sourceRef: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

export type NormalizedConnectorEvent = IncomingConnectorEvent & {
  eventType: string;
};

export interface ProviderAdapter {
  provider: ConnectorProvider;
  category: "communication" | "document" | "development" | "scheduling" | "storage";
  adapterName: string;
  supportedEvents: string[];
  normalize(event: IncomingConnectorEvent): NormalizedConnectorEvent;
}

const eventTypeMap: Record<string, string> = {
  created: "record.created",
  updated: "record.updated",
  deleted: "record.deleted",
  received: "message.received",
  sent: "message.sent",
  accepted: "calendar.event.accepted",
  declined: "calendar.event.declined",
};

function createAdapter(provider: ConnectorProvider, category: ProviderAdapter["category"], supportedEvents: string[]): ProviderAdapter {
  return {
    provider,
    category,
    adapterName: provider,
    supportedEvents,
    normalize(event) {
      return {
        ...event,
        eventType: eventTypeMap[event.eventType.toLowerCase()] ?? "record.observed",
        payload: { ...event.payload, normalizedFrom: event.eventType },
      };
    },
  };
}

export const providerAdapters: Record<ConnectorProvider, ProviderAdapter> = {
  gmail: createAdapter("gmail", "communication", ["EmailReceived", "ThreadUpdated", "EmailSentDetected"]),
  proton: createAdapter("proton", "communication", ["EmailReceived", "ThreadUpdated", "EmailSentDetected"]),
  github: createAdapter("github", "development", ["CommitPushed", "IssueOpened", "IssueResolved", "PROpened", "PRMerged", "BuildFailed", "RepoInactive"]),
  google_drive: createAdapter("google_drive", "storage", ["FileCreated", "FileUpdated", "FileDeleted", "DocumentCreated", "DocumentUpdated"]),
  google_calendar: createAdapter("google_calendar", "scheduling", ["CalendarEventCreated", "CalendarEventUpdated", "CalendarEventCancelled", "TravelDetected", "MeetingWithPersonDetected"]),
  replit: createAdapter("replit", "development", ["CommitPushed", "BuildFailed"]),
};