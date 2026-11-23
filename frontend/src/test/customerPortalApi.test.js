import { afterEach, describe, expect, it, vi } from 'vitest';
import axiosClient from '../api/axiosClient';
import { customerApi } from '../api/customerPortalApi';
import { toApiDateTime } from '../utils/customerDateTime';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('customer portal API contract', () => {
  it('maps the backend PageResponse envelope to table data and pagination metadata', async () => {
    const records = [{ id: 21, sku: 'SKU-21' }];
    vi.spyOn(axiosClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { content: records, page: 2, size: 10, totalElements: 21, totalPages: 3 },
        meta: null,
        message: 'Thành công',
      },
    });

    await expect(customerApi.products.getList({ page: 2, size: 10 })).resolves.toEqual({
      items: records,
      meta: { page: 2, size: 10, totalElements: 21, totalPages: 3 },
    });
    expect(axiosClient.get).toHaveBeenCalledWith('/products', { params: { page: 2, size: 10 } });
  });

  it('rejects list responses that do not match the backend page structure', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({
      data: { success: true, data: [], meta: null, message: 'Thành công' },
    });

    await expect(customerApi.inbound.getList({ page: 0, size: 10 }))
      .rejects.toThrow('Dữ liệu phân trang trả về không đúng định dạng.');
  });

  it('sends inbound creation payloads unchanged to the matching endpoint', async () => {
    const payload = {
      expectedAt: '2026-11-22T09:30:00',
      timeSlot: 'MORNING',
      items: [{ productId: 7, expectedQuantity: 12.5 }],
    };
    vi.spyOn(axiosClient, 'post').mockResolvedValue({
      data: { success: true, data: { id: 4 }, meta: null, message: 'Thành công' },
    });

    await customerApi.inbound.create(payload);

    expect(axiosClient.post).toHaveBeenCalledWith('/inbound-receipts', payload);
  });

  it('sends outbound orders using backend DTO field names', async () => {
    const payload = {
      recipientName: 'Nguyen Van A',
      recipientPhone: '0900000000',
      deliveryAddress: 'Ha Noi',
      paymentMethod: 'COD',
      codAmount: 250000,
      items: [{ productId: 7, quantityRequested: 2 }],
    };
    vi.spyOn(axiosClient, 'post').mockResolvedValue({
      data: { success: true, data: { id: 8 }, meta: null, message: 'Thành công' },
    });

    await customerApi.outbound.create(payload);

    expect(axiosClient.post).toHaveBeenCalledWith('/outbound-orders', payload);
  });

  it('sends product dimensions to the product creation endpoint', async () => {
    const payload = {
      sku: 'SKU-21',
      name: 'Sản phẩm',
      unit: 'cái',
      lengthCm: 1,
      widthCm: 2,
      heightCm: 3,
    };
    vi.spyOn(axiosClient, 'post').mockResolvedValue({
      data: { success: true, data: { id: 21 }, meta: null, message: 'Thành công' },
    });

    await customerApi.products.create(payload);

    expect(axiosClient.post).toHaveBeenCalledWith('/products', payload);
  });

  it('serializes datetime-local values as LocalDateTime without a timezone suffix', () => {
    expect(toApiDateTime('2026-11-22T09:30')).toBe('2026-11-22T09:30:00');
    expect(toApiDateTime('')).toBeUndefined();
    expect(toApiDateTime('invalid')).toBeUndefined();
  });

  it('requests the customer COD reconciliation endpoint with Spring pagination parameters', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
        meta: null,
      },
    });

    await customerApi.outbound.getMyCodOrders({ page: 0, size: 10 });

    expect(axiosClient.get).toHaveBeenCalledWith('/cod/me', { params: { page: 0, size: 10 } });
  });
});
