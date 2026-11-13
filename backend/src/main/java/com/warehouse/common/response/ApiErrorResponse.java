package com.warehouse.common.response;

/** Envelope lỗi API chung theo contract: success=false và thông tin lỗi nằm trong error. */
public record ApiErrorResponse(
        boolean success,
        ApiError error
) {
    /**
     * Tạo envelope lỗi; constructor này đảm bảo mọi lỗi có cùng cấu trúc JSON.
     *
     * @param code mã lỗi ổn định để FE xử lý, ví dụ VALIDATION_ERROR
     * @param message thông báo lỗi có thể hiển thị hoặc ghi nhận ở client
     * @param details thông tin bổ sung, ví dụ danh sách lỗi validation theo field
     */
    public ApiErrorResponse(String code, String message, Object details) {
        this(false, new ApiError(code, message, details));
    }

    /** Chi tiết lỗi lồng trong ApiErrorResponse. */
    public record ApiError(String code, String message, Object details) {
    }
}