import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGate } from "./auth/AuthGate";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/Home";
import { StartHerePage } from "./pages/StartHere";
import { VisionPage } from "./pages/Vision";
import { ConstitutionPage } from "./pages/Constitution";
import { ArchitecturePage, LayerDetailPage } from "./pages/Architecture";
import { TasksPage, TaskDetailPage } from "./pages/Tasks";
import { KnowledgePage } from "./pages/Knowledge";
import { SystemsPage } from "./pages/Systems";
import { GlossaryPage } from "./pages/Glossary";
import { VersionHistoryPage } from "./pages/VersionHistory";
import { IntegrationManualPage } from "./pages/IntegrationManual";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="font-mono text-4xl font-bold text-muted-foreground/30 mb-4">404</p>
      <p className="text-sm text-muted-foreground">Page not found.</p>
      <a href="/" className="mt-4 text-sm text-primary hover:underline">Back to Overview</a>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/start-here" component={StartHerePage} />
      <Route path="/vision" component={VisionPage} />
      <Route path="/constitution" component={ConstitutionPage} />
      <Route path="/architecture" component={ArchitecturePage} />
      <Route path="/architecture/:layerId" component={LayerDetailPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/tasks/:taskId" component={TaskDetailPage} />
      <Route path="/knowledge" component={KnowledgePage} />
      <Route path="/systems" component={SystemsPage} />
      <Route path="/glossary" component={GlossaryPage} />
      <Route path="/version-history" component={VersionHistoryPage} />
      <Route path="/integration-manual" component={IntegrationManualPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthGate>
          <Layout>
            <Router />
          </Layout>
        </AuthGate>
      </WouterRouter>
    </QueryClientProvider>
  );
}
