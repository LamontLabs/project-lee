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

function createAdapter(provider: ConnectorProvider): ProviderAdapter {
  return {
    provider,
    normalize(event) {
      return {
        ...event,
        eventType: eventTypeMap[event.eventType.toLowerCase()] ?? "record.observed",
      };
    },
  };
}

export const providerAdapters: Record<ConnectorProvider, ProviderAdapter> = {
  gmail: createAdapter("gmail"),
  proton: createAdapter("proton"),
  github: createAdapter("github"),
  google_drive: createAdapter("google_drive"),
  google_calendar: createAdapter("google_calendar"),
  replit: createAdapter("replit"),
};