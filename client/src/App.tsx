import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import StudentsPage from "@/pages/students";
import StudentDetailPage from "@/pages/student-detail";
import AppointmentsPage from "@/pages/appointments";
import ReportsPage from "@/pages/reports-new";
import SettingsPage from "@/pages/settings";
import CounselingSessionsPage from "@/pages/counseling-sessions-final";

function Router() {
  return (
    <Switch>
      {/* Protected routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/students" component={StudentsPage} />
      <ProtectedRoute path="/students/:id" component={StudentDetailPage} />
      <ProtectedRoute path="/appointments" component={AppointmentsPage} />
      <ProtectedRoute path="/counseling-sessions-final" component={CounselingSessionsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
