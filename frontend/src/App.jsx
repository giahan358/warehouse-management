import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import CustomerRoutes from './routes/CustomerRoutes';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import CustomerLoginPage from './pages/auth/CustomerLoginPage';
import './assets/styles/customer.css';

function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#075bc2',
          colorLink: '#075bc2',
          borderRadius: 4,
          fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif",
          fontSize: 13,
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/customer/login" element={<CustomerLoginPage />} />
            </Route>
            <Route path="/customer/*" element={<CustomerRoutes />} />
            <Route path="/*" element={<AppRoutes />} />
            <Route path="*" element={<Navigate to="/customer/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
