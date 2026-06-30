import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Gallery from './pages/Gallery';
import Login from './pages/Login';
import { AdminRoute } from './admin/AdminRoute';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import Photos from './admin/Photos';
import Notices from './admin/Notices';
import Invites from './admin/Invites';

// A simple PrivateRoute component to check for token
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* User Gallery Route */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Gallery />
            </PrivateRoute>
          } 
        />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="photos" element={<Photos />} />
          <Route path="notices" element={<Notices />} />
          <Route path="invites" element={<Invites />} />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
