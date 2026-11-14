package com.warehouse.scheduler;

import com.warehouse.common.enums.InvoiceStatus;
import com.warehouse.invoice.repository.InvoiceRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class InvoiceOverdueScheduler {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final InvoiceRepository invoiceRepository;

    public InvoiceOverdueScheduler(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void markOverdueInvoices() {
        invoiceRepository.findByStatusAndDueDateBefore(InvoiceStatus.UNPAID, LocalDate.now(BUSINESS_ZONE))
                .forEach(invoice -> invoice.setStatus(InvoiceStatus.OVERDUE));
    }
}
