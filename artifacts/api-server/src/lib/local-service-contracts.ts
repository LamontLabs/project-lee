import { asc, eq } from "drizzle-orm";
import { db, eventLog, localServiceContract, type LocalServiceContract } from "@workspace/db";

export type LocalServiceContractInput = {
  contractId: string;
  provider: string;
  displayName: string;
  description: string;
  targetType?: string;
  port: number;
  paths: string[];
};

export type LocalServiceContractEntry = Pick<
  LocalServiceContract,
  "contractId" | "provider" | "displayName" | "targetType" | "port" | "paths"
>;

export const DEFAULT_LOCAL_SERVICE_CONTRACTS: LocalServiceContractInput[] = [
  {
    contractId: "lee-system",
    provider: "lee",
    displayName: "LEE System Contract",
    description: "The local LEE system contract for this desktop runtime.",
    targetType: "local_system",
    port: 4317,
    paths: ["/api/contract", "/api/system-contract"],
  },
  {
    contractId: "k6",
    provider: "k6",
    displayName: "K6 Service Contract",
    description: "The approved local K6 specialist contract.",
    targetType: "service",
    port: 6420,
    paths: ["/k6/contract", "/api/contract"],
  },
];

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const PATH_PATTERN = /^\/[a-zA-Z0-9._/:-]*$/;

function cleanText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") throw new Error(`${field} is required.`);
  const result = value.trim();
  if (!result || result.length > max) throw new Error(`${field} must be between 1 and ${max} characters.`);
  return result;
}

export function validateLocalServiceContract(value: unknown): LocalServiceContractInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A local service contract is required.");
  const input = value as Record<string, unknown>;
  const contractId = cleanText(input.contractId, "Contract ID", 64).toLowerCase();
  const provider = cleanText(input.provider, "Provider", 64).toLowerCase();
  if (!ID_PATTERN.test(contractId)) throw new Error("Contract ID may use lowercase letters, numbers, dots, underscores, and hyphens.");
  if (!PROVIDER_PATTERN.test(provider)) throw new Error("Provider may use lowercase letters, numbers, dots, underscores, and hyphens.");
  const displayName = cleanText(input.displayName, "Display name", 160);
  const description = cleanText(input.description, "Description", 240);
  const targetType = input.targetType === undefined ? "service" : cleanText(input.targetType, "Target type", 32);
  if (!["local_system", "service"].includes(targetType)) throw new Error("Target type must be local_system or service.");
  if (!Number.isInteger(input.port) || Number(input.port) < 1 || Number(input.port) > 65535) throw new Error("Port must be an integer from 1 to 65535.");
  if (!Array.isArray(input.paths) || input.paths.length < 1 || input.paths.length > 8) throw new Error("Provide between 1 and 8 approved paths.");
  const paths = [...new Set(input.paths.map((path) => cleanText(path, "Path", 240)))];
  if (paths.some((path) => !PATH_PATTERN.test(path))) throw new Error("Paths must be fixed URL paths without query strings or wildcards.");
  return { contractId, provider, displayName, description, targetType, port: Number(input.port), paths };
}

function publicContract(row: LocalServiceContract) {
  return {
    id: row.id,
    contractId: row.contractId,
    provider: row.provider,
    displayName: row.displayName,
    description: row.description,
    targetType: row.targetType,
    port: row.port,
    paths: row.paths,
    enabled: row.enabled,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function ensureDefaultLocalServiceContracts(): Promise<void> {
  await db.insert(localServiceContract).values(DEFAULT_LOCAL_SERVICE_CONTRACTS).onConflictDoNothing({ target: localServiceContract.contractId });
}

export async function listLocalServiceContracts() {
  await ensureDefaultLocalServiceContracts();
  const rows = await db.select().from(localServiceContract).orderBy(asc(localServiceContract.displayName));
  return rows.map(publicContract);
}

export async function listEnabledLocalServiceContractEntries(): Promise<LocalServiceContractEntry[]> {
  await ensureDefaultLocalServiceContracts();
  return db
    .select({
      contractId: localServiceContract.contractId,
      provider: localServiceContract.provider,
      displayName: localServiceContract.displayName,
      targetType: localServiceContract.targetType,
      port: localServiceContract.port,
      paths: localServiceContract.paths,
    })
    .from(localServiceContract)
    .where(eq(localServiceContract.enabled, true))
    .orderBy(asc(localServiceContract.displayName));
}

export async function createLocalServiceContract(value: unknown) {
  const input = validateLocalServiceContract(value);
  const [created] = await db.insert(localServiceContract).values(input).returning();
  await db.insert(eventLog).values({
    eventType: "LocalServiceContractApproved",
    aggregateType: "local_service_contract",
    aggregateId: created.id,
    sourceRef: "local-service-contracts",
    occurredAt: new Date(),
    payload: { contractId: created.contractId, provider: created.provider, port: created.port, paths: created.paths, enabled: true },
  });
  return publicContract(created);
}

export async function setLocalServiceContractEnabled(id: string, enabled: boolean) {
  const [updated] = await db
    .update(localServiceContract)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(localServiceContract.id, id))
    .returning();
  if (!updated) return null;
  await db.insert(eventLog).values({
    eventType: enabled ? "LocalServiceContractRestored" : "LocalServiceContractRemoved",
    aggregateType: "local_service_contract",
    aggregateId: updated.id,
    sourceRef: "local-service-contracts",
    occurredAt: new Date(),
    payload: { contractId: updated.contractId, provider: updated.provider, port: updated.port, paths: updated.paths, enabled },
  });
  return publicContract(updated);
}