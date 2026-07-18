import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { BorrowersPage } from './pages/BorrowersPage';
import { LoansPage } from './pages/LoansPage';
import { LoanDetailPage } from './pages/LoanDetailPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Cargando...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/borrowers"
        element={
          <ProtectedRoute>
            <BorrowersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loans"
        element={
          <ProtectedRoute>
            <LoansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loans/:id"
        element={
          <ProtectedRoute>
            <LoanDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={isAuthenticated ? <Navigate to="/loans" /> : <Navigate to="/login" />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
