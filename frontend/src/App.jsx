 
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Destinations from "./pages/Destinations";
import Packages from "./pages/Packages";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import UsersManagement from "./pages/UsersManagement";
import CustomerProfile from "./pages/CustomerProfile";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/register" element={<Register />} />
        <Route path="/admin/users" element={<UsersManagement />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
