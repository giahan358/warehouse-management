package com.warehouse.inbound.dto;

import com.warehouse.common.enums.InboundStatus;
import com.warehouse.common.enums.InboundTimeSlot;
import com.warehouse.inbound.repository.InboundReceiptSummaryProjection;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InboundReceiptResponse(
        Long id,
        String receiptCode,
        Long customerId,
        String customerName,
        InboundStatus status,
        String vehiclePlate,
        String dockCode,
        InboundTimeSlot timeSlot,
        LocalDateTime expectedAt,
        LocalDateTime receivedAt,
        BigDecimal declaredTotal,
        BigDecimal actualTotal,
        BigDecimal damagedTotal,
        BigDecimal variance) {

    public static InboundReceiptResponse from(InboundReceiptSummaryProjection projection) {
        return new InboundReceiptResponse(
                projection.getId(),
                projection.getReceiptCode(),
                projection.getCustomerId(),
                projection.getCustomerName(),
                InboundStatus.valueOf(projection.getStatus()),
                projection.getVehiclePlate(),
                projection.getDockCode(),
                projection.getTimeSlot() == null ? null : InboundTimeSlot.valueOf(projection.getTimeSlot()),
                projection.getExpectedAt(),
                projection.getReceivedAt(),
                projection.getDeclaredTotal(),
                projection.getActualTotal(),
                projection.getDamagedTotal(),
                projection.getVariance());
    }
}
