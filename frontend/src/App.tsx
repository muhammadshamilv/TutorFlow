import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/context/AuthContext";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { StudentDashboardPage } from "@/pages/student/StudentDashboardPage";
import { TutorDashboardPage } from "@/pages/tutor/TutorDashboardPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRedirect } from "@/routes/RoleRedirect";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/" element={<RoleRedirect />} />

          <Route
            path="/tutor"
            element={
              <ProtectedRoute allowedRole="tutor">
                <TutorDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;