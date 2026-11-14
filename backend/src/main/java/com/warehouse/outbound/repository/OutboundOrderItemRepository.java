package com.warehouse.outbound.repository;

import com.warehouse.outbound.model.OutboundOrderItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OutboundOrderItemRepository extends JpaRepository<OutboundOrderItem, Long> {
    List<OutboundOrderItem> findByOrderIdOrderById(Long orderId);

    List<OutboundOrderItem> findByOrderIdInOrderById(Collection<Long> orderIds);

    @Query("select i.orderId as orderId, count(i) as itemCount from OutboundOrderItem i "
            + "where i.orderId in :orderIds group by i.orderId")
    List<OutboundItemCountProjection> countByOrderIds(@Param("orderIds") Collection<Long> orderIds);
}
