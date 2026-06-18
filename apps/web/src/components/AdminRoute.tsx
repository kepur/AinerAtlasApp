import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

// Guards in-app content-management pages. The backend now enforces admin role on
// the underlying write endpoints, so non-admins are redirected home rather than
// landing on pages that would only return 403s.
export default function AdminRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const role = useAuthStore((s) => s.user?.role);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== "admin" && role !== "super_admin") return <Navigate to="/" replace />;
  return <Outlet />;
}
