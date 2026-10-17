import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoginPage } from './pages/LoginPage';
import { ClientesPage } from './pages/ClientesPage';
import { PrestamosPage } from './pages/PrestamosPage';
import { DetallePrestamoPage } from './pages/DetallePrestamoPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <ClientesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prestamos"
        element={
          <ProtectedRoute>
            <PrestamosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prestamos/:id"
        element={
          <ProtectedRoute>
            <DetallePrestamoPage />
          </ProtectedRoute>
        }
      />
      {/* Redirecciones por compatibilidad */}
      <Route path="/borrowers" element={<Navigate to="/clientes" replace />} />
      <Route path="/loans" element={<Navigate to="/prestamos" replace />} />
      
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/prestamos" replace /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <AppRoutes />
            <Toaster position="top-right" />
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
