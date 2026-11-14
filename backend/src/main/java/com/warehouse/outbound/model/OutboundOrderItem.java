package com.warehouse.outbound.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "outbound_order_items")
@Getter
@Setter
public class OutboundOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity_requested", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityRequested;

    @Column(name = "quantity_actual", precision = 12, scale = 3)
    private BigDecimal quantityActual;

    @Column(name = "pick_note", length = 255)
    private String pickNote;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;
}
