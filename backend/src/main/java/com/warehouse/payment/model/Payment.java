package com.warehouse.payment.model;

import com.warehouse.common.enums.PaymentMethod;
import com.warehouse.common.enums.PaymentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payments")
@Getter @Setter
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "invoice_id", nullable = false)
    private Long invoiceId;
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;
    @Column(name = "transaction_ref", length = 150)
    private String transactionRef;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;
    @Column(name = "vnp_txn_ref", unique = true, length = 100)
    private String vnpTxnRef;
    @Column(name = "vnp_transaction_no", length = 50)
    private String vnpTransactionNo;
    @Column(name = "vnp_bank_code", length = 20)
    private String vnpBankCode;
    @Column(name = "vnp_response_code", length = 5)
    private String vnpResponseCode;
    @Column(name = "confirmed_by")
    private Long confirmedBy;
    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
