package com.warehouse.email.service;

import com.warehouse.outbound.service.OutboundInDeliveryEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@Slf4j
public class OutboundEmailListener {
    private final EmailService emailService;

    public OutboundEmailListener(EmailService emailService) {
        this.emailService = emailService;
    }

    /** Sends the notification only after the outbound status change has committed. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderInDelivery(OutboundInDeliveryEvent event) {
        try {
            emailService.sendOutboundOrderNotification(event.orderId(), event.actorEmail());
        } catch (RuntimeException exception) {
            log.error("Unable to process automatic email for outbound order {}", event.orderId(), exception);
        }
    }
}
