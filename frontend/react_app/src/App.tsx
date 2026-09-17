import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/layouts/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { DayNotePage } from "@/pages/DayNotePage";
import { EventFormPage } from "@/pages/EventFormPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ShiftSettingsPage } from "@/pages/ShiftSettingsPage";
import { TodoCreatePage } from "@/pages/TodoCreatePage";
import { TodoDetailPage } from "@/pages/TodoDetailPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/todos/new" element={<TodoCreatePage />} />
            <Route path="/todos/:todoId" element={<TodoDetailPage />} />
            <Route path="/notes/:date" element={<DayNotePage />} />
            <Route path="/events/new" element={<EventFormPage />} />
            <Route path="/events/:eventId" element={<EventFormPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings/shifts" element={<ShiftSettingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
