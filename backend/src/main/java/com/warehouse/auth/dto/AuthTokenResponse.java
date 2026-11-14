package com.warehouse.auth.dto;

public record AuthTokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        AuthUserResponse user) {
}
