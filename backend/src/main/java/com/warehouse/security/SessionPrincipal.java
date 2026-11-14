package com.warehouse.security;

import com.warehouse.common.enums.UserRole;
import java.util.List;

public record SessionPrincipal(String subject, UserRole role) {
    public String getSubject() {
        return subject;
    }

    public List<String> roles() {
        return List.of(role.name());
    }
}
