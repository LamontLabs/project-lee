import { getOAuthAccessToken, setConnectionStatus } from "./connection-center";

export type EmailAddress = { name?: string; email: string };
export type EmailAttachment = { id: string; filename: string; mimeType: string; size: number; messageId: string };
export type EmailMessage = {
  id: string;
  threadId: string;
  subject: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc: EmailAddress[];
  date: Date;
  snippet: string;
  labels: string[];
  unread: boolean;
  hasAttachments: boolean;
  attachments: EmailAttachment[];
  bodyText?: string;
  provider: string;
  webUrl?: string;
};
export type EmailThread = { id: string; subject: string; messages: EmailMessage[]; participants: EmailAddress[]; lastMessageAt?: Date; labels: string[] };
export type EmailDraft = { id: string; message: EmailMessage; };
export type EmailSyncResult = { messages: EmailMessage[]; nextHistoryId?: string; fullSync: boolean; duplicateCount: number };

export interface EmailProvider {
  listMessages(options?: { query?: string; pageToken?: string; maxResults?: number; includeSpamTrash?: boolean }): Promise<{ messages: EmailMessage[]; nextPageToken?: string }>;
  listUnread(): Promise<EmailMessage[]>;
  search(query: string, options?: { pageToken?: string; maxResults?: number }): Promise<{ messages: EmailMessage[]; nextPageToken?: string }>;
  getMessage(messageId: string, includeBody?: boolean): Promise<EmailMessage>;
  getThread(threadId: string): Promise<EmailThread>;
  getAttachment(messageId: string, attachmentId: string): Promise<{ filename?: string; mimeType?: string; dataBase64: string }>;
  createDraft(input: { to: EmailAddress[]; cc?: EmailAddress[]; subject: string; bodyText: string; threadId?: string }): Promise<EmailDraft>;
  updateDraft(draftId: string, input: { to: EmailAddress[]; cc?: EmailAddress[]; subject: string; bodyText: string; threadId?: string }): Promise<EmailDraft>;
  archive(messageId: string): Promise<EmailMessage>;
  markRead(messageId: string, read: boolean): Promise<EmailMessage>;
  modifyLabels(messageId: string, addLabelIds?: string[], removeLabelIds?: string[]): Promise<EmailMessage>;
  send(input: { to: EmailAddress[]; cc?: EmailAddress[]; subject: string; bodyText: string; threadId?: string; inReplyTo?: string; references?: string[] }): Promise<EmailMessage>;
  sync(historyId?: string): Promise<EmailSyncResult>;
}

type GmailHeader = { name?: string; value?: string };
type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[]; mimeType?: string; filename?: string; body?: { data?: string; attachmentId?: string; size?: number }; parts?: GmailMessage["payload"][] };
  sizeEstimate?: number;
};
type GmailResponse = { messages?: GmailMessage[]; nextPageToken?: string; historyId?: string; resultSizeEstimate?: number };

function header(message: GmailMessage, name: string) {
  return message.payload?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}
function address(value: string): EmailAddress[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = part.match(/^(.*?)\s*<([^>]+)>$/);
    return match ? { name: match[1].replace(/^["']|["']$/g, "").trim() || undefined, email: match[2].trim() } : { email: part.replace(/^["']|["']$/g, "") };
  });
}
function decode(data?: string) {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}
function collectParts(part: GmailMessage["payload"], result: { text: string; attachments: EmailAttachment[] }, message: GmailMessage) {
  if (!part) return;
  if (part.body?.attachmentId && part.filename) result.attachments.push({ id: part.body.attachmentId, filename: part.filename, mimeType: part.mimeType ?? "application/octet-stream", size: part.body.size ?? 0, messageId: message.id });
  if (part.mimeType === "text/plain" && part.body?.data) result.text += decode(part.body.data);
  for (const child of part.parts ?? []) collectParts(child, result, message);
}
function toEmail(message: GmailMessage, includeBody = false): EmailMessage {
  const parts = { text: "", attachments: [] as EmailAttachment[] };
  if (includeBody) collectParts(message.payload, parts, message);
  const dateValue = Number(message.internalDate ?? 0) || Date.now();
  return {
    id: message.id, threadId: message.threadId, subject: header(message, "Subject") || "(no subject)",
    from: address(header(message, "From")), to: address(header(message, "To")), cc: address(header(message, "Cc")),
    date: new Date(dateValue), snippet: message.snippet ?? "", labels: message.labelIds ?? [],
    unread: (message.labelIds ?? []).includes("UNREAD"), hasAttachments: parts.attachments.length > 0,
    attachments: parts.attachments, ...(includeBody ? { bodyText: parts.text } : {}),
    provider: "gmail", webUrl: `https://mail.google.com/mail/u/0/#all/${message.id}`,
  };
}
function encodedMessage(input: { to: EmailAddress[]; cc?: EmailAddress[]; subject: string; bodyText: string; inReplyTo?: string; references?: string[] }) {
  const lines = [
    `To: ${input.to.map((item) => item.name ? `"${item.name}" <${item.email}>` : item.email).join(", ")}`,
    ...(input.cc?.length ? [`Cc: ${input.cc.map((item) => item.email).join(", ")}`] : []),
    `Subject: ${input.subject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8",
    ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`] : []),
    ...(input.references?.length ? [`References: ${input.references.join(" ")}`] : []),
    "", input.bodyText,
  ].join("\r\n");
  return Buffer.from(lines).toString("base64url");
}

export class GmailProvider implements EmailProvider {
  readonly provider = "gmail";
  constructor(private readonly connectionId: string) {}
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    try {
      const token = await getOAuthAccessToken(this.connectionId);
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, { ...init, headers: { accept: "application/json", authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) await setConnectionStatus(this.connectionId, "needs_reauthorization", "Gmail authorization needs to be renewed.");
        throw new Error(`Gmail request failed (${response.status}).`);
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error && error.message.includes("authorization")) await setConnectionStatus(this.connectionId, "needs_reauthorization", "Gmail authorization needs to be renewed.");
      throw error;
    }
  }
  private async raw(id: string, includeBody = false) {
    return this.request<GmailMessage>(`/messages/${encodeURIComponent(id)}?format=${includeBody ? "full" : "metadata"}${includeBody ? "" : "&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date"}`);
  }
  async listMessages(options: { query?: string; pageToken?: string; maxResults?: number; includeSpamTrash?: boolean } = {}) {
    const params = new URLSearchParams({ maxResults: String(Math.min(options.maxResults ?? 50, 100)), ...(options.query ? { q: options.query } : {}), ...(options.pageToken ? { pageToken: options.pageToken } : {}), ...(options.includeSpamTrash ? { includeSpamTrash: "true" } : {}) });
    const result = await this.request<GmailResponse>(`/messages?${params}`);
    const messages = await Promise.all((result.messages ?? []).map((item) => this.raw(item.id)));
    return { messages: messages.map((item) => toEmail(item)), nextPageToken: result.nextPageToken };
  }
  listUnread() { return this.listMessages({ query: "is:unread" }).then((result) => result.messages); }
  search(query: string, options: { pageToken?: string; maxResults?: number } = {}) { return this.listMessages({ ...options, query }); }
  async getMessage(messageId: string, includeBody = true) { return toEmail(await this.raw(messageId, includeBody), includeBody); }
  async getThread(threadId: string) {
    const result = await this.request<{ id: string; messages?: GmailMessage[] }>(`/threads/${encodeURIComponent(threadId)}?format=full`);
    const messages = (result.messages ?? []).map((item) => toEmail(item, true));
    const participants = [...new Map(messages.flatMap((item) => [...item.from, ...item.to, ...item.cc]).map((item) => [item.email, item])).values()];
    return { id: result.id, subject: messages[0]?.subject ?? "(no subject)", messages, participants, lastMessageAt: messages.at(-1)?.date, labels: [...new Set(messages.flatMap((item) => item.labels))] };
  }
  async getAttachment(messageId: string, attachmentId: string) {
    const result = await this.request<{ data?: string }>(`/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`);
    const message = await this.getMessage(messageId, true);
    const attachment = message.attachments.find((item) => item.id === attachmentId);
    return { filename: attachment?.filename, mimeType: attachment?.mimeType, dataBase64: result.data ?? "" };
  }
  private async mutate(path: string, body: Record<string, unknown>) { return this.request<GmailMessage>(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  private draftPayload(input: { to: EmailAddress[]; cc?: EmailAddress[]; subject: string; bodyText: string; threadId?: string }) { return { message: { raw: encodedMessage(input), ...(input.threadId ? { threadId: input.threadId } : {}) } }; }
  async createDraft(input: { to: EmailAddress[]; cc?: EmailAddress[]; subject: string; bodyText: string; threadId?: string }) {
    const result = await this.request<{ id: string; message: GmailMessage }>("/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(this.draftPayload(input)) });
    return { id: result.id, message: toEmail(result.message, true) };
  }
  async updateDraft(draftId: string, input: { to: EmailAddress[]; cc?: EmailAddress[]; subject: string; bodyText: string; threadId?: string }) {
    const result = await this.request<{ id: string; message: GmailMessage }>(`/drafts/${encodeURIComponent(draftId)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(this.draftPayload(input)) });
    return { id: result.id ?? draftId, message: toEmail(result.message, true) };
  }
  async archive(messageId: string) { return toEmail(await this.mutate(`/messages/${encodeURIComponent(messageId)}/modify`, { removeLabelIds: ["INBOX"] })); }
  async markRead(messageId: string, read: boolean) { return toEmail(await this.mutate(`/messages/${encodeURIComponent(messageId)}/modify`, read ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] })); }
  async modifyLabels(messageId: string, addLabelIds: string[] = [], removeLabelIds: string[] = []) { return toEmail(await this.mutate(`/messages/${encodeURIComponent(messageId)}/modify`, { addLabelIds, removeLabelIds })); }
  async send(input: { to: EmailAddress[]; cc?: EmailAddress[]; subject: string; bodyText: string; threadId?: string; inReplyTo?: string; references?: string[] }) { return toEmail(await this.mutate("/messages/send", { raw: encodedMessage(input), ...(input.threadId ? { threadId: input.threadId } : {}) }), true); }
  async sync(historyId?: string): Promise<EmailSyncResult> {
    if (!historyId) {
      const profile = await this.request<{ historyId?: string }>("/profile");
      const listed = await this.listMessages({ query: "in:anywhere", maxResults: 100 });
      return { messages: listed.messages, nextHistoryId: profile.historyId, fullSync: true, duplicateCount: 0 };
    }
    const result = await this.request<{ history?: Array<{ messagesAdded?: Array<{ message?: GmailMessage }>; messages?: GmailMessage[] }>; historyId?: string }>(`/history?startHistoryId=${encodeURIComponent(historyId)}&historyTypes=messageAdded&historyTypes=labelAdded&historyTypes=labelRemoved`);
    const candidates = (result.history ?? []).flatMap((item) => [...(item.messagesAdded ?? []).map((entry) => entry.message), ...(item.messages ?? [])]).filter((item): item is GmailMessage => Boolean(item?.id));
    const unique = [...new Map(candidates.map((item) => [item.id, item])).values()];
    const messages = await Promise.all(unique.map((item) => this.getMessage(item.id)));
    return { messages, nextHistoryId: result.historyId, fullSync: false, duplicateCount: candidates.length - unique.length };
  }
}

export function emailProviderFor(provider: string, connectionId: string): EmailProvider {
  if (provider === "gmail") return new GmailProvider(connectionId);
  throw new Error(`No email provider is registered for ${provider}.`);
}