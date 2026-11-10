package com.warehouse.outbound.service;

public record OutboundInDeliveryEvent(Long orderId, String actorEmail) {
}
