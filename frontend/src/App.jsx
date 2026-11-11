import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import CustomerRoutes from './routes/CustomerRoutes';
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
      <BrowserRouter>
        <Routes>
          <Route path="/customer/*" element={<CustomerRoutes />} />
          <Route path="*" element={<Navigate to="/customer/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
