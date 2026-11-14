import { Spin } from 'antd'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div style={{ display: 'grid', minHeight: '50vh', placeItems: 'center' }}><Spin size="large" /></div>
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
