import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RoleRoute({ allow }) {
  const { user } = useAuth()
  return allow.includes(user?.role) ? <Outlet /> : <Navigate to="/" replace />
}
