package com.warehouse.security;

import org.springframework.security.core.AuthenticationException;

public class AccountLockedAuthenticationException extends AuthenticationException {
    public AccountLockedAuthenticationException() {
        super("Account is locked");
    }
}
