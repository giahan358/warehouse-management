package com.warehouse.exception;

import com.warehouse.response.ApiErrorResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Chuẩn hóa lỗi validation trên request body, thường phát sinh từ @Valid.
     * Mỗi phần tử details chứa tên field và lý do field không hợp lệ.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception) {
        List<Map<String, String>> details = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> Map.of(
                        "field", error.getField(),
                        "message", error.getDefaultMessage() == null
                                ? "Invalid value"
                                : error.getDefaultMessage()))
                .toList();

        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Request validation failed", details);
    }

    /**
     * Chuẩn hóa lỗi validation ở tham số query, path hoặc constraint cấp method.
     * Trả danh sách vi phạm để FE có thể gắn lỗi vào đúng trường.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
            ConstraintViolationException exception) {
        List<Map<String, String>> details = exception.getConstraintViolations()
                .stream()
                .map(violation -> Map.of(
                        "field", violation.getPropertyPath().toString(),
                        "message", violation.getMessage()))
                .toList();

        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Request validation failed", details);
    }

    /**
     * Xử lý body JSON thiếu, sai cú pháp hoặc không thể chuyển sang kiểu request.
     * Lỗi này trả HTTP 400 với mã INVALID_REQUEST.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableMessage(
            HttpMessageNotReadableException exception) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST",
                "Request body is missing or malformed", null);
    }

    /**
     * Trả envelope lỗi chung khi Spring không tìm thấy route/tài nguyên được yêu cầu.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResourceFound(
            NoResourceFoundException exception) {
        return error(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND",
                "Resource not found", null);
    }

    /**
     * Giữ HTTP status được chủ động ném bởi ứng dụng và chuyển nó thành error envelope.
     * Các status phổ biến được ánh xạ sang mã lỗi chung trong tài liệu API.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(
            ResponseStatusException exception) {
        HttpStatusCode status = exception.getStatusCode();
        HttpStatus knownStatus = HttpStatus.resolve(status.value());
        String code = status.value() == HttpStatus.NOT_FOUND.value()
                ? "RESOURCE_NOT_FOUND"
                : status.value() == HttpStatus.CONFLICT.value()
                    ? "RESOURCE_CONFLICT"
                    : status.value() == HttpStatus.BAD_REQUEST.value()
                        ? "INVALID_REQUEST"
                        : knownStatus == null ? "HTTP_ERROR" : knownStatus.name();
        String message = exception.getReason() == null
                ? knownStatus == null ? "Request failed" : knownStatus.getReasonPhrase()
                : exception.getReason();

        return error(status, code, message, null);
    }

    /**
     * Bắt lỗi chưa được xử lý ở các handler cụ thể, ghi stack trace và không lộ
     * chi tiết nội bộ trong response gửi về client.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception) {
        log.error("Unexpected API error", exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred", null);
    }

    /**
     * Hàm nội bộ tạo response lỗi với HTTP status và cấu trúc JSON thống nhất.
     * details có thể là null hoặc dữ liệu bổ sung, chẳng hạn danh sách lỗi field.
     */
    private ResponseEntity<ApiErrorResponse> error(
            HttpStatusCode status, String code, String message, Object details) {
        return ResponseEntity.status(status)
                .body(new ApiErrorResponse(code, message, details));
    }
}
