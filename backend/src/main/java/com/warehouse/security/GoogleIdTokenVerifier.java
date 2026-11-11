package com.warehouse.security;

import com.warehouse.common.exception.BusinessException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class GoogleIdTokenVerifier {
    private final JwtDecoder decoder;
    private final String clientId;

    public GoogleIdTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId;
        NimbusJwtDecoder googleDecoder = NimbusJwtDecoder
                .withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .build();
        googleDecoder.setJwtValidator(tokenValidator(clientId));
        this.decoder = googleDecoder;
    }

    public Map<String, Object> verify(String idToken) {
        if (clientId == null || clientId.isBlank()) {
            throw new BusinessException(
                    HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_LOGIN_NOT_CONFIGURED", "Đăng nhập Google chưa được cấu hình");
        }
        try {
            Jwt jwt = decoder.decode(idToken);
            if (!Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
                throw invalidGoogleToken();
            }
            return jwt.getClaims();
        } catch (JwtException exception) {
            throw invalidGoogleToken();
        }
    }

    private OAuth2TokenValidator<Jwt> tokenValidator(String clientId) {
        OAuth2TokenValidator<Jwt> issuerValidator =
                JwtValidators.createDefaultWithIssuer("https://accounts.google.com");
        return jwt -> {
            OAuth2TokenValidatorResult issuerResult = issuerValidator.validate(jwt);
            if (issuerResult.hasErrors()) {
                return issuerResult;
            }
            if (!jwt.getAudience().contains(clientId)) {
                return OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_token", "Google token audience does not match", null));
            }
            return OAuth2TokenValidatorResult.success();
        };
    }

    private BusinessException invalidGoogleToken() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN", "Google ID token không hợp lệ");
    }
}
