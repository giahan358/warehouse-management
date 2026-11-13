package com.warehouse.inbound.dto;

import com.warehouse.common.enums.InboundStatus;
import com.warehouse.common.enums.InboundTimeSlot;
import com.warehouse.inbound.model.InboundReceipt;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InboundReceiptDetailResponse(
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
        String note,
        BigDecimal declaredTotal,
        BigDecimal actualTotal,
        BigDecimal damagedTotal,
        BigDecimal variance,
        List<InboundReceiptItemResponse> items) {

    public static InboundReceiptDetailResponse from(
            InboundReceipt receipt,
            String customerName,
            List<InboundReceiptItemResponse> items) {
        BigDecimal declared = BigDecimal.ZERO;
        BigDecimal actual = BigDecimal.ZERO;
        BigDecimal damaged = BigDecimal.ZERO;
        boolean fullyCounted = true;
        for (InboundReceiptItemResponse item : items) {
            declared = declared.add(item.expectedQuantity());
            if (item.actualQuantity() != null) {
                actual = actual.add(item.actualQuantity());
            } else {
                fullyCounted = false;
            }
            if (item.damagedQuantity() != null) {
                damaged = damaged.add(item.damagedQuantity());
            }
        }
        return new InboundReceiptDetailResponse(
                receipt.getId(),
                receipt.getReceiptCode(),
                receipt.getCustomerId(),
                customerName,
                receipt.getStatus(),
                receipt.getVehiclePlate(),
                receipt.getDockCode(),
                receipt.getTimeSlot(),
                receipt.getExpectedAt(),
                receipt.getReceivedAt(),
                receipt.getNote(),
                declared,
                actual,
                damaged,
                fullyCounted ? actual.subtract(declared) : null,
                List.copyOf(items));
    }
}
