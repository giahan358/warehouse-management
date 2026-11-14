package com.warehouse.invoice.repository;

import java.math.BigDecimal;

public interface InvoiceSummaryProjection {
    Long getTotalInvoices();
    Long getTotalUnpaid();
    Long getTotalOverdue();
    BigDecimal getTotalPaidAmount();
    BigDecimal getTotalUnpaidAmount();
}
