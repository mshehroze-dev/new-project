import { Routes, Route } from "react-router-dom";import { AuthProvider } from "./components/auth/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";import { Layout } from "./components/layout/Layout";
import Home from "./pages/Home";import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Billing from "./pages/Billing";import AIPlayground from "./pages/AIPlayground";
export default function App() {
  return (    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <AIPlayground />
              </ProtectedRoute>
            }
          />          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />          
        </Routes>
      </Layout>
    </AuthProvider>  );
}
