import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import DataImport from "./pages/DataImport";
import EODReport from "./pages/EODReport";
import { POS, Orders, OrderHistory, Menu, Bar, Kitchen, Inventory, Staff, Customers, Reports, SettingsPage } from "./pages/modules";
import NotFound from "./pages/NotFound";

// Query client configuration with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

// Wrap component with ErrorBoundary for safety
const SafeRoute = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              {/* Protected Dashboard Routes - All wrapped with ErrorBoundary */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<SafeRoute><Dashboard /></SafeRoute>} />
                <Route path="/profile" element={<SafeRoute><Profile /></SafeRoute>} />
                <Route path="/pos" element={<SafeRoute><POS /></SafeRoute>} />
                <Route path="/orders" element={<SafeRoute><Orders /></SafeRoute>} />
                <Route path="/order-history" element={<SafeRoute><OrderHistory /></SafeRoute>} />
                <Route path="/eod-report" element={<SafeRoute><EODReport /></SafeRoute>} />
                <Route path="/menu" element={<SafeRoute><Menu /></SafeRoute>} />
                <Route path="/bar" element={<SafeRoute><Bar /></SafeRoute>} />
                <Route path="/kitchen" element={<SafeRoute><Kitchen /></SafeRoute>} />
                <Route path="/inventory" element={<SafeRoute><Inventory /></SafeRoute>} />
                <Route path="/staff" element={<SafeRoute><Staff /></SafeRoute>} />
                <Route path="/customers" element={<SafeRoute><Customers /></SafeRoute>} />
                <Route path="/reports" element={<SafeRoute><Reports /></SafeRoute>} />
                <Route path="/settings" element={<SafeRoute><SettingsPage /></SafeRoute>} />
                <Route path="/data-import" element={<SafeRoute><DataImport /></SafeRoute>} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
