package com.warehouse.inbound.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "inbound_receipt_items")
public class InboundReceiptItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "expected_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal expectedQuantity;

    @Column(name = "actual_quantity", precision = 12, scale = 3)
    private BigDecimal actualQuantity;

    @Column(name = "damaged_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal damagedQuantity = BigDecimal.ZERO;

    @Column(name = "location_code", length = 50)
    private String locationCode;

    @Column(columnDefinition = "TEXT")
    private String note;

    public Long getId() { return id; }
    public Long getReceiptId() { return receiptId; }
    public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public BigDecimal getExpectedQuantity() { return expectedQuantity; }
    public void setExpectedQuantity(BigDecimal expectedQuantity) { this.expectedQuantity = expectedQuantity; }
    public BigDecimal getActualQuantity() { return actualQuantity; }
    public void setActualQuantity(BigDecimal actualQuantity) { this.actualQuantity = actualQuantity; }
    public BigDecimal getDamagedQuantity() { return damagedQuantity; }
    public void setDamagedQuantity(BigDecimal damagedQuantity) { this.damagedQuantity = damagedQuantity; }
    public String getLocationCode() { return locationCode; }
    public void setLocationCode(String locationCode) { this.locationCode = locationCode; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
