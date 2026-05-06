import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppShell from "./pages/AppShell";
import ConvitesAdmin from "./pages/ConvitesAdmin";
import EmpresasAdmin from "./pages/EmpresasAdmin";
import AuditoriaPage from "./pages/AuditoriaPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin/convites" element={<ProtectedRoute><AppProvider><ConvitesAdmin /></AppProvider></ProtectedRoute>} />
              <Route path="/admin/empresas" element={<ProtectedRoute><AppProvider><EmpresasAdmin /></AppProvider></ProtectedRoute>} />
              <Route path="/admin/auditoria" element={<ProtectedRoute><AppProvider><AuditoriaPage /></AppProvider></ProtectedRoute>} />
              <Route path="/*" element={<ProtectedRoute><AppProvider><AppShell /></AppProvider></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
