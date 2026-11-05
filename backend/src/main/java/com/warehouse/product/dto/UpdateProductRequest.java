package com.warehouse.product.dto;

import com.warehouse.common.enums.ProductCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateProductRequest(
        @NotBlank @Size(max = 100) String sku,
        @Size(max = 50) String barcode,
        @NotBlank @Size(max = 200) String name,
        ProductCategory category,
        String description,
        @NotBlank @Size(max = 30) String unit,
        @DecimalMin(value = "0.01") BigDecimal lengthCm,
        @DecimalMin(value = "0.01") BigDecimal widthCm,
        @DecimalMin(value = "0.01") BigDecimal heightCm) {
}
