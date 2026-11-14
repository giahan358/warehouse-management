package com.warehouse.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String resourceName) {
        this(resourceName, null);
    }

    public ResourceNotFoundException(String resourceName, Object id) {
        super(
                HttpStatus.NOT_FOUND,
                "RESOURCE_NOT_FOUND",
                id == null
                        ? resourceName + " không tồn tại"
                        : resourceName + " không tồn tại: " + id);
    }
}
