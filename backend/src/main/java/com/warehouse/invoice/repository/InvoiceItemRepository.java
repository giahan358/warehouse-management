package com.warehouse.invoice.repository;

import com.warehouse.invoice.model.InvoiceItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {
    List<InvoiceItem> findByInvoiceIdOrderById(Long invoiceId);
}
