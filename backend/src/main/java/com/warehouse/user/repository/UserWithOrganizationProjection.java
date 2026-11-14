package com.warehouse.user.repository;

public interface UserWithOrganizationProjection {
    Long getId();

    String getFullName();

    String getEmail();

    String getPhone();

    String getRole();

    String getStatus();

    String getLockReason();

    String getLoginMethod();

    String getOrganization();
}
