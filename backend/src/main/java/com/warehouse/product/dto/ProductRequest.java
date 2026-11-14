package com.warehouse.product.dto;

import com.warehouse.common.enums.ProductCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductRequest(
        Long customerId,
        @NotBlank @Size(max = 100) String sku,
        @Size(max = 50) String barcode,
        @NotBlank @Size(max = 200) String name,
        ProductCategory category,
        String description,
        @NotBlank @Size(max = 30) String unit,
        @NotNull @DecimalMin(value = "0.01") BigDecimal lengthCm,
        @NotNull @DecimalMin(value = "0.01") BigDecimal widthCm,
        @NotNull @DecimalMin(value = "0.01") BigDecimal heightCm) {
}
