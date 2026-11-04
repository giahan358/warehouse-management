package com.warehouse.response;

/** Standard envelope for successful API responses. */
public record ApiResponse<T>(
        boolean success,
        T data,
        Object meta,
        String message
) {
    /**
     * Tạo response thành công không có metadata, dùng cho object hoặc kết quả đơn.
     *
     * @param data dữ liệu trả về; có thể null nếu endpoint không có nội dung
     * @param message thông báo ngắn cho client
     * @param <T> kiểu dữ liệu trong data
     * @return envelope thành công với meta bằng null
     */
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, null, message);
    }

    /**
     * Tạo response thành công có metadata, thường dùng cho danh sách phân trang.
     *
     * @param data dữ liệu trả về, ví dụ danh sách phần tử của trang hiện tại
     * @param meta metadata như page, size, totalElements và totalPages
     * @param message thông báo ngắn cho client
     * @param <T> kiểu dữ liệu trong data
     * @return envelope thành công kèm metadata
     */
    public static <T> ApiResponse<T> success(T data, Object meta, String message) {
        return new ApiResponse<>(true, data, meta, message);
    }
}
