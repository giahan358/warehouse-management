package com.warehouse.user.dto;

import java.util.List;
import java.util.Map;

public record UserPermissionMatrixResponse(List<PermissionGroup> groups) {
    public record PermissionGroup(String name, Map<String, Boolean> roles) {
    }
}
