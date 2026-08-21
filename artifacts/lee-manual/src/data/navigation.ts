export type NavItem = {
  id: string;
  label: string;
  path: string;
  children?: NavItem[];
  badge?: string;
  status?: "canonical" | "draft" | "implementation";
};

export const NAVIGATION: NavItem[] = [
  {
    id: "home",
    label: "Overview",
    path: "/",
    status: "canonical",
  },
  {
    id: "start-here",
    label: "Start Here",
    path: "/start-here",
    status: "canonical",
  },
  {
    id: "vision",
    label: "Vision and Identity",
    path: "/vision",
    status: "canonical",
  },
  {
    id: "constitution",
    label: "Constitution",
    path: "/constitution",
    status: "canonical",
    badge: "13 Provisions",
  },
  {
    id: "architecture",
    label: "Architecture Explorer",
    path: "/architecture",
    status: "canonical",
    children: [
      { id: "layer-0", label: "Layer 0 — Identity", path: "/architecture/layer-0" },
      { id: "layer-1", label: "Layer 1 — Foundations", path: "/architecture/layer-1" },
      { id: "layer-2", label: "Layer 2 — Knowledge", path: "/architecture/layer-2" },
      { id: "layer-3", label: "Layer 3 — Retrieval", path: "/architecture/layer-3" },
      { id: "layer-4", label: "Layer 4 — Intelligence", path: "/architecture/layer-4" },
      { id: "layer-5", label: "Layer 5 — Coordination", path: "/architecture/layer-5" },
      { id: "layer-6", label: "Layer 6 — Operational Context", path: "/architecture/layer-6" },
      { id: "layer-6b", label: "Layer 6b — Portfolio Intelligence", path: "/architecture/layer-6b" },
      { id: "layer-7", label: "Layer 7 — Connected Lamont Labs Systems", path: "/architecture/layer-7" },
      { id: "layer-8", label: "Layer 8 — Provider Layer", path: "/architecture/layer-8" },
      { id: "layer-9", label: "Layer 9 — Interfaces and Observability", path: "/architecture/layer-9" },
    ],
  },
  {
    id: "tasks",
    label: "Task Manual",
    path: "/tasks",
    status: "canonical",
    badge: "69 Tasks",
  },
  {
    id: "knowledge",
    label: "Knowledge and Data",
    path: "/knowledge",
    status: "canonical",
    children: [
      { id: "ledgers", label: "Knowledge Ledgers", path: "/knowledge/ledgers" },
      { id: "epistemic", label: "Epistemic Signals", path: "/knowledge/epistemic" },
      { id: "progression", label: "Knowledge Progression", path: "/knowledge/progression" },
    ],
  },
  {
    id: "integration-manual",
    label: "Integration Manual",
    path: "/integration-manual",
    status: "implementation",
    badge: "Wiring Guide",
  },
  {
    id: "systems",
    label: "LEE, CIL, and CerbaSeal",
    path: "/systems",
    status: "canonical",
  },
  {
    id: "glossary",
    label: "Glossary",
    path: "/glossary",
    status: "canonical",
  },
  {
    id: "version-history",
    label: "Version History",
    path: "/version-history",
    status: "canonical",
  },
];
