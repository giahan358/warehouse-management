import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axiosClient from '../api/axiosClient';
import App from '../App';

const profile = {
  businessName: 'Doanh nghiệp',
  customerCode: 'CUST-TEST',
  servicePackage: 'STANDARD',
  usedM3: 0,
  capacityM3: 0,
  usedPercent: 0,
};

function response(data, meta = null) {
  return { data: { success: true, data, meta, message: 'Thành công' } };
}

function mockCustomerApi(role = 'CUSTOMER') {
  vi.spyOn(axiosClient, 'get').mockImplementation(async (path) => {
    if (path === '/auth/me') return response({ role, fullName: 'Tài khoản', email: 'customer@example.com', customerCode: 'CUST-TEST' });
    if (path === '/customers/me') return response(profile);
    if (path === '/dashboard/customer') return response({
      usedM3: 0,
      capacityM3: 0,
      usedPercent: 0,
      totalOnHand: 0,
      totalAvailable: 0,
      totalAllocated: 0,
      skuCount: 0,
      activeInboundCount: 0,
      provisionalFeeThisPeriod: 0,
      unpaidInvoiceCount: 0,
    });
    if (path === '/dashboard/customer/operations' || path === '/inventory/me'
      || path === '/inbound-receipts' || path === '/outbound-orders'
      || path === '/products' || path === '/invoices/me') {
      return response([], { page: 0, size: 20, totalElements: 0, totalPages: 0 });
    }
    if (path === '/inbound-receipts/status-counts') return response({ all: 0, scheduled: 0, receiving: 0, confirmed: 0, cancelled: 0 });
    if (path === '/outbound-orders/status-counts') return response({ pending: 0, preparing: 0, packed: 0, inDelivery: 0, delivered: 0, returned: 0, cancelled: 0 });
    if (path === '/invoices/me/current') return response({ invoice: null, daysLeft: null, amountDue: null });
    throw new Error(`Unexpected API request: ${path}`);
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('customer portal routes', () => {
  it.each([
    ['/customer/overview', 'Tổng quan & Tồn kho của tôi'],
    ['/customer/inbound', 'Đăng ký & Lịch nhập kho'],
    ['/customer/outbound', 'Yêu cầu xuất kho & Giao hàng'],
    ['/customer/products', 'Danh mục & Thông tin sản phẩm'],
    ['/customer/invoices', 'Hóa đơn phí dịch vụ & Thanh toán'],
    ['/customer/profile', 'Hồ sơ Doanh nghiệp & Tài khoản'],
  ])('renders %s with API-backed data', async (path, title) => {
    mockCustomerApi();
    window.history.replaceState({}, '', path);

    render(<App />);

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(axiosClient.get).toHaveBeenCalledWith('/auth/me');
    await waitFor(() => expect(axiosClient.get).toHaveBeenCalledWith('/customers/me'));
    expect(screen.getAllByText('CUST-TEST').length).toBeGreaterThan(0);
  });

  it('blocks non-customer roles from customer pages', async () => {
    mockCustomerApi('WAREHOUSE_STAFF');
    window.history.replaceState({}, '', '/customer/overview');

    render(<App />);

    expect(await screen.findByText('Không có quyền truy cập')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tổng quan & Tồn kho của tôi' })).not.toBeInTheDocument();
  });

  it('does not render a login or registration page', async () => {
    mockCustomerApi();
    window.history.replaceState({}, '', '/login');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Tổng quan & Tồn kho của tôi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tiếp tục với google|đăng nhập/i })).not.toBeInTheDocument();
  });
});
