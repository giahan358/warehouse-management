package com.warehouse.config;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.CodStatus;
import com.warehouse.common.enums.InboundStatus;
import com.warehouse.common.enums.InboundTimeSlot;
import com.warehouse.common.enums.InvoiceStatus;
import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.common.enums.ProductCategory;
import com.warehouse.common.enums.ServicePackage;
import com.warehouse.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/meta")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("isAuthenticated()")
public class MetaController {
    @GetMapping("/options")
    public ApiResponse<Map<String, List<String>>> options() {
        Map<String, List<String>> options = Map.of(
                "carriers", Arrays.stream(Carrier.values()).map(Enum::name).toList(),
                "categories", names(ProductCategory.values()),
                "servicePackages", names(ServicePackage.values()),
                "units", List.of("thùng", "hộp", "gói", "kiện", "m3", "chuyến", "kỳ"),
                "orderStatuses", names(OutboundStatus.values()),
                "receiptStatuses", names(InboundStatus.values()),
                "timeSlots", names(InboundTimeSlot.values()),
                "codStatuses", names(CodStatus.values()),
                "invoiceStatuses", names(InvoiceStatus.values()),
                "loginMethods", names(LoginMethod.values()));
        return ApiResponse.success(options, "Lấy danh mục dùng chung thành công");
    }

    private List<String> names(Enum<?>[] values) {
        return Arrays.stream(values).map(Enum::name).toList();
    }
}
