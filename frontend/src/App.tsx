import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { PatientPage } from "./pages/PatientPage";
import { AdminPage } from "./pages/AdminPage";

function Nav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow-lg px-2 py-1.5 flex gap-1">
      <Link
        to="/patient"
        className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
          loc.pathname === "/patient"
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        Pacient
      </Link>
      <Link
        to="/admin"
        className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
          loc.pathname === "/admin"
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        Admin
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/patient" replace />} />
        <Route path="/patient" element={<PatientPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
