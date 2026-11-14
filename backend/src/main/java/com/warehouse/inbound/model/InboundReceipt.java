package com.warehouse.inbound.model;

import com.warehouse.common.enums.InboundStatus;
import com.warehouse.common.enums.InboundTimeSlot;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "inbound_receipts")
public class InboundReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receipt_code", nullable = false, unique = true, length = 50)
    private String receiptCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InboundStatus status;

    @Column(name = "vehicle_plate", length = 20)
    private String vehiclePlate;

    @Column(name = "dock_code", length = 20)
    private String dockCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_slot", length = 20)
    private InboundTimeSlot timeSlot;

    @Column(name = "expected_at", nullable = false)
    private LocalDateTime expectedAt;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public String getReceiptCode() { return receiptCode; }
    public void setReceiptCode(String receiptCode) { this.receiptCode = receiptCode; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public Long getConfirmedBy() { return confirmedBy; }
    public void setConfirmedBy(Long confirmedBy) { this.confirmedBy = confirmedBy; }
    public InboundStatus getStatus() { return status; }
    public void setStatus(InboundStatus status) { this.status = status; }
    public String getVehiclePlate() { return vehiclePlate; }
    public void setVehiclePlate(String vehiclePlate) { this.vehiclePlate = vehiclePlate; }
    public String getDockCode() { return dockCode; }
    public void setDockCode(String dockCode) { this.dockCode = dockCode; }
    public InboundTimeSlot getTimeSlot() { return timeSlot; }
    public void setTimeSlot(InboundTimeSlot timeSlot) { this.timeSlot = timeSlot; }
    public LocalDateTime getExpectedAt() { return expectedAt; }
    public void setExpectedAt(LocalDateTime expectedAt) { this.expectedAt = expectedAt; }
    public LocalDateTime getReceivedAt() { return receivedAt; }
    public void setReceivedAt(LocalDateTime receivedAt) { this.receivedAt = receivedAt; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
