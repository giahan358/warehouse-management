package com.warehouse.common.util;

import com.warehouse.common.exception.BusinessException;
import java.util.Locale;
import org.springframework.http.HttpStatus;

public final class EnumParser {
    private EnumParser() {
    }

    public static <E extends Enum<E>> String parseFilter(
            String value, Class<E> enumType, String fieldName) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        try {
            return Enum.valueOf(enumType, normalized).name();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "Bộ lọc " + fieldName + " không hợp lệ");
        }
    }
}
