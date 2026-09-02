import { desc, eq } from "drizzle-orm";
import { db, eventLog, graphEdge, graphNode, organizationalProfile, organizationalResource, person } from "@workspace/db";

const DEFAULT_PROFILE = {
  structure: { departments: ["Engineering", "Products", "Operations", "Growth"], currentTeam: ["Founder"], futureRoles: ["Engineering support", "Advisory support"] },
  peopleCategories: { employees: [], partners: [], investors: [], advisors: [], clients: [], pilotPartners: [], competitors: [] },
  infrastructureOwnership: { shared: ["LEE API", "PostgreSQL", "Console hosting"], singlePointsOfFailure: ["Founder access", "API server"] },
  technologyOwnership: { projects: [], sharedPatterns: ["Event-backed domain records", "Provider abstraction"] },
  revenueModel: { currentStreams: [], plannedStreams: [], sharedCommercialInfrastructure: [] },
  legalCompliance: { entityStructure: "Lamont Labs", activeAgreements: [], requirementsByProject: {} },
  sharedServices: { CIL: ["LEE API", "Reasoning"], CerbaSeal: ["Governance", "Consequential actions"], PostgreSQL: ["All LEE artifacts"] },
};

function categorizedPeople(people: Array<typeof person.$inferSelect>) {
  const result: Record<string, unknown[]> = { employees: [], partners: [], investors: [], advisors: [], clients: [], pilotPartners: [], competitors: [] };
  for (const entry of people) {
    const role = (entry.organizationalRole ?? entry.roles[0] ?? "partners").toLowerCase().replace(/[- ]/g, "_");
    const key = ({ employee: "employees", partner: "partners", investor: "investors", advisor: "advisors", client: "clients", pilot_partner: "pilotPartners", competitor: "competitors" } as Record<string, string>)[role] ?? "partners";
    result[key].push({ id: entry.id, name: entry.displayName, role: entry.organizationalRole ?? role, projects: entry.projects, health: entry.relationshipHealth });
  }
  return result;
}

async function ensureProfile() {
  let [profile] = await db.select().from(organizationalProfile).where(eq(organizationalProfile.profileKey, "lamont-labs")).limit(1);
  if (!profile) {
    const now = new Date();
    [profile] = await db.insert(organizationalProfile).values({ profileKey: "lamont-labs", legalName: "Lamont Labs", ...DEFAULT_PROFILE, sourceRef: "organizational-onboarding", createdAt: now, updatedAt: now }).returning();
    await db.insert(eventLog).values({ eventType: "OrganizationalProfileCreated", aggregateType: "organizational_profile", aggregateId: profile.id, sourceRef: "organizational-onboarding", occurredAt: now, payload: { profileId: profile.id, legalName: profile.legalName } });
  }
  return profile;
}

async function linkGraph(profileId: string, resourceIds: string[]) {
  const [insertedOrgNode] = await db.insert(graphNode).values({ objectType: "organizational_profile", objectId: profileId, label: "Lamont Labs", metadata: { source: "organizational-memory" } }).onConflictDoNothing({ target: [graphNode.objectType, graphNode.objectId] }).returning();
  const orgNode = insertedOrgNode ?? (await db.select().from(graphNode).where(eq(graphNode.objectId, profileId)).limit(1))[0];
  if (!orgNode) return;
  for (const resourceId of resourceIds) {
    const [resourceNode] = await db.insert(graphNode).values({ objectType: "organizational_resource", objectId: resourceId, label: "Organizational resource", metadata: { source: "organizational-memory" } }).onConflictDoNothing({ target: [graphNode.objectType, graphNode.objectId] }).returning();
    const node = resourceNode ?? (await db.select().from(graphNode).where(eq(graphNode.objectId, resourceId)).limit(1))[0];
    if (node) await db.insert(graphEdge).values({ sourceNodeId: orgNode.id, targetNodeId: node.id, edgeType: "OWNS_OR_DEPENDS_ON", confidence: 1, sourceRef: "organizational-memory", metadata: {} }).onConflictDoNothing();
  }
}

export async function getOrganization() {
  const profile = await ensureProfile();
  const [people, resources] = await Promise.all([
    db.select().from(person).orderBy(desc(person.updatedAt)),
    db.select().from(organizationalResource).where(eq(organizationalResource.profileId, profile.id)).orderBy(desc(organizationalResource.updatedAt)),
  ]);
  const categories = categorizedPeople(people);
  if (JSON.stringify(profile.peopleCategories) !== JSON.stringify(categories)) {
    const now = new Date();
    await db.update(organizationalProfile).set({ peopleCategories: categories, updatedAt: now, sourceRef: "relationship-engine-sync" }).where(eq(organizationalProfile.id, profile.id));
    await db.insert(eventLog).values({ eventType: "OrganizationalProfileUpdated", aggregateType: "organizational_profile", aggregateId: profile.id, sourceRef: "relationship-engine-sync", occurredAt: now, payload: { profileId: profile.id, changedSections: ["peopleCategories"], peopleCount: people.length } });
  }
  await linkGraph(profile.id, resources.map((resource) => resource.id));
  return { ...profile, peopleCategories: categories, people, resources, profileVersion: profile.updatedAt.toISOString(), updatedFrom: ["relationship-engine", "bootstrap-engine", "connector-events", "understanding-pipeline"] };
}

export async function updateOrganization(patch: Partial<typeof DEFAULT_PROFILE>, sourceRef = "owner-console") {
  const profile = await ensureProfile();
  const now = new Date();
  const [updated] = await db.update(organizationalProfile).set({
    structure: patch.structure ?? profile.structure,
    peopleCategories: patch.peopleCategories ?? profile.peopleCategories,
    infrastructureOwnership: patch.infrastructureOwnership ?? profile.infrastructureOwnership,
    technologyOwnership: patch.technologyOwnership ?? profile.technologyOwnership,
    revenueModel: patch.revenueModel ?? profile.revenueModel,
    legalCompliance: patch.legalCompliance ?? profile.legalCompliance,
    sharedServices: patch.sharedServices ?? profile.sharedServices,
    sourceRef,
    updatedAt: now,
  }).where(eq(organizationalProfile.id, profile.id)).returning();
  await db.insert(eventLog).values({ eventType: "OrganizationalProfileUpdated", aggregateType: "organizational_profile", aggregateId: profile.id, sourceRef, occurredAt: now, payload: { profileId: profile.id, changedSections: Object.keys(patch) } });
  return getOrganization().then(() => updated);
}

export async function addOrganizationalResource(input: { resourceType: string; name: string; ownerRef: string; projectRefs?: string[]; dependencyRefs?: string[]; sourceRef?: string }) {
  const profile = await ensureProfile();
  const now = new Date();
  const [resource] = await db.insert(organizationalResource).values({ profileId: profile.id, resourceType: input.resourceType, name: input.name, ownerRef: input.ownerRef, projectRefs: input.projectRefs ?? [], dependencyRefs: input.dependencyRefs ?? [], sourceRef: input.sourceRef ?? "bootstrap-engine", metadata: {}, createdAt: now, updatedAt: now }).returning();
  await db.insert(eventLog).values({ eventType: "OrganizationalResourceLinked", aggregateType: "organizational_resource", aggregateId: resource.id, sourceRef: input.sourceRef ?? "bootstrap-engine", occurredAt: now, payload: { profileId: profile.id, resourceId: resource.id, resourceType: resource.resourceType, name: resource.name } });
  await linkGraph(profile.id, [resource.id]);
  return resource;
}