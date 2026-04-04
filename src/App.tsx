import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Rotas from "./pages/Rotas";
import Motoristas from "./pages/Motoristas";
import Veiculos from "./pages/Veiculos";
import NotasFiscais from "./pages/NotasFiscais";
import Relatorios from "./pages/Relatorios";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/rotas" element={
            <ProtectedRoute>
              <AppLayout>
                <Rotas />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/motoristas" element={
            <ProtectedRoute>
              <AppLayout>
                <Motoristas />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/veiculos" element={
            <ProtectedRoute>
              <AppLayout>
                <Veiculos />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/notas-fiscais" element={
            <ProtectedRoute>
              <AppLayout>
                <NotasFiscais />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/relatorios" element={
            <ProtectedRoute>
              <AppLayout>
                <Relatorios />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
