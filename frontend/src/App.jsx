import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Destinations from "./pages/Destinations";
import Packages from "./pages/Packages";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import UsersManagement from "./pages/UsersManagement";
import CustomerProfile from "./pages/CustomerProfile";
import MyBookings from "./pages/MyBookings";
import Invoices from "./pages/Invoices";
import PaymentManagement from "./pages/PaymentManagement";
import BookingTracking from "./pages/BookingTracking";
import RefundManagement from "./pages/RefundManagement";
import SettingsPage from "./pages/Settings";
import Utilities from "./pages/Utilities";
import ReportsAudit from "./pages/ReportsAudit";
import ActivityLogs from "./pages/ActivityLogs";
import StaffActivity from "./pages/StaffActivity";
import StaffActivityDetails from "./pages/StaffActivityDetails";


function AppLayout() {
  const location = useLocation();

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  // The Higher Admin dashboard has its own sidebar and header.
  // Keep the public navbar on every other route and for other roles.
  const isHigherAdminDashboard =
    location.pathname === "/dashboard" &&
    user?.role_name === "HIGHER_ADMIN";

  return (
    <>
      {!isHigherAdminDashboard && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/users" element={<UsersManagement />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />
        <Route path="/customer/bookings" element={<MyBookings />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<PaymentManagement />} />
        <Route path="/booking-tracking" element={<BookingTracking />} />
        <Route path="/refunds" element={<RefundManagement />} />
        <Route path="/settings" element={<SettingsPage />} />
         <Route path="/admin/utilities" element={<Utilities />} />
        <Route path="/admin/reports" element={<ReportsAudit />} />
        <Route path="/admin/activity-logs" element={<ActivityLogs />} />
        <Route path="/admin/staff-activity" element={<StaffActivity />} />
        <Route path="/admin/staff-activity/:staffId" element={<StaffActivityDetails />} />

      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
