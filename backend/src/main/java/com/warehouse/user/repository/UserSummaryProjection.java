package com.warehouse.user.repository;

public interface UserSummaryProjection {
    long getTotalUsers();

    long getCustomerCount();

    long getStaffCount();

    long getLockedCount();
}
