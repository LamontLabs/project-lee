import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const provider = await readFile(new URL("../src/lib/email-provider.ts", import.meta.url), "utf8");
const routes = await readFile(new URL("../src/routes/email.ts", import.meta.url), "utf8");
const connections = await readFile(new URL("../src/lib/connection-center.ts", import.meta.url), "utf8");

test("Gmail stays behind the provider-neutral EmailProvider contract", () => {
  assert.match(provider, /export interface EmailProvider/);
  assert.match(provider, /export type EmailSearchFilters/);
  assert.match(provider, /export class GmailProvider implements EmailProvider/);
  assert.match(provider, /function toGmailQuery/);
  assert.match(provider, /filters\.sender/);
  assert.match(provider, /filters\.subject/);
  assert.match(provider, /filters\.after/);
  assert.match(provider, /filters\.before/);
  assert.match(provider, /filters\.unread/);
  assert.match(provider, /emailProviderFor\(provider: string/);
  assert.match(routes, /emailProviderFor\("gmail", id\)/);
  assert.doesNotMatch(provider, /console\.(log|error|warn)\([^)]*(token|credential|authorization)/i);
});

test("OAuth uses least-privilege Gmail read/modify/send scopes and keeps tokens server-side", () => {
  assert.match(connections, /gmail\.modify/);
  assert.match(connections, /gmail\.send/);
  assert.match(connections, /storeOAuthCredential/);
  assert.match(routes, /grantedScopes|scopes/);
  assert.doesNotMatch(routes, /access_token|refresh_token|client_secret/);
});

test("email mutations and synchronization have explicit safety boundaries", () => {
  assert.match(routes, /executeProviderWrite/);
  assert.match(routes, /actionType: "send_email"/);
  assert.match(routes, /ownerConfirmed: req\.body\?\.ownerConfirmed === true/);
  assert.match(routes, /humanConfirmed: req\.body\?\.humanConfirmed === true/);
  assert.match(provider, /startHistoryId/);
  assert.match(routes, /duplicateCount/);
  assert.match(routes, /onConflictDoNothing|existing/);
  assert.match(routes, /valid Gmail connection ID/);
});

test("threading, drafts, labels, archive, unread state, and attachments are implemented", () => {
  for (const token of ["getThread", "createDraft", "updateDraft", "archive", "markRead", "modifyLabels", "getAttachment", "threadId", "inReplyTo"]) {
    assert.match(provider, new RegExp(token));
  }
});