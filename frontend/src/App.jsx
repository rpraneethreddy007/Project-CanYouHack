// Router setup. All role-guarded routes wrapped in RoleGuard.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RoleGuard from "./components/RoleGuard";

// Professor/TA pages
import ProfessorDashboard from "./pages/ProfessorDashboard";
import AssignmentCreate from "./pages/AssignmentCreate";
import FlaggedStudents from "./pages/FlaggedStudents";
import DiffViewer from "./pages/DiffViewer";

// Student pages
import StudentDashboard from "./pages/StudentDashboard";
import QuestionDetail from "./pages/QuestionDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Professor / TA routes */}
        <Route
          path="/professor/dashboard"
          element={
            <RoleGuard allow={["professor", "ta"]}>
              <ProfessorDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/professor/assignments/new"
          element={
            <RoleGuard allow={["professor", "ta"]}>
              <AssignmentCreate />
            </RoleGuard>
          }
        />
        <Route
          path="/professor/questions/:questionId/flags"
          element={
            <RoleGuard allow={["professor", "ta"]}>
              <FlaggedStudents />
            </RoleGuard>
          }
        />
        <Route
          path="/professor/questions/:questionId/flags/:flagId/diff"
          element={
            <RoleGuard allow={["professor", "ta"]}>
              <DiffViewer />
            </RoleGuard>
          }
        />

        {/* Student routes */}
        <Route
          path="/student/dashboard"
          element={
            <RoleGuard allow={["student"]}>
              <StudentDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/student/questions/:questionId"
          element={
            <RoleGuard allow={["student"]}>
              <QuestionDetail />
            </RoleGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
