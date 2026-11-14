package com.warehouse.product.dto;

import com.warehouse.common.enums.ProductCategory;
import com.warehouse.common.enums.ProductStatus;
import com.warehouse.common.enums.StockStatus;
import com.warehouse.product.repository.ProductProjection;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ProductResponse(
        Long id,
        Long customerId,
        String sku,
        String barcode,
        String name,
        ProductCategory category,
        String description,
        String unit,
        BigDecimal lengthCm,
        BigDecimal widthCm,
        BigDecimal heightCm,
        BigDecimal volumeM3,
        ProductStatus status,
        BigDecimal onHand,
        BigDecimal allocated,
        BigDecimal available,
        LocalDate expiryDate,
        StockStatus stockStatus) {

    public static ProductResponse from(ProductProjection product) {
        return new ProductResponse(
                product.getId(),
                product.getCustomerId(),
                product.getSku(),
                product.getBarcode(),
                product.getName(),
                product.getCategory() == null ? null : ProductCategory.valueOf(product.getCategory()),
                product.getDescription(),
                product.getUnit(),
                product.getLengthCm(),
                product.getWidthCm(),
                product.getHeightCm(),
                product.getVolumeM3(),
                ProductStatus.valueOf(product.getStatus()),
                zeroIfNull(product.getOnHand()),
                zeroIfNull(product.getAllocated()),
                zeroIfNull(product.getAvailable()),
                product.getExpiryDate(),
                StockStatus.valueOf(product.getStockStatus()));
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
