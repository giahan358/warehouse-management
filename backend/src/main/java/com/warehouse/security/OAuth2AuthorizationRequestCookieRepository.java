package com.warehouse.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class OAuth2AuthorizationRequestCookieRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {
    static final String COOKIE_NAME = "OAUTH2_AUTH_REQUEST";
    private static final int COOKIE_MAX_AGE_SECONDS = 300;
    private static final int MAX_COOKIE_VALUE_LENGTH = 3500;
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final ObjectMapper objectMapper;
    private final SecretKeySpec signingKey;

    public OAuth2AuthorizationRequestCookieRepository(
            ObjectMapper objectMapper,
            @Value("${app.jwt.secret:}") String secret) {
        byte[] key = secret.getBytes(StandardCharsets.UTF_8);
        if (key.length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        this.objectMapper = objectMapper;
        this.signingKey = new SecretKeySpec(key, HMAC_ALGORITHM);
    }

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        String cookieValue = findCookie(request);
        if (cookieValue == null) {
            return null;
        }

        int separator = cookieValue.indexOf('.');
        if (separator <= 0 || separator == cookieValue.length() - 1) {
            return null;
        }

        try {
            byte[] payload = Base64.getUrlDecoder().decode(cookieValue.substring(0, separator));
            byte[] signature = Base64.getUrlDecoder().decode(cookieValue.substring(separator + 1));
            if (!MessageDigest.isEqual(sign(payload), signature)) {
                return null;
            }
            StoredAuthorizationRequest stored =
                    objectMapper.readValue(payload, StoredAuthorizationRequest.class);
            return OAuth2AuthorizationRequest.authorizationCode()
                    .authorizationUri(stored.authorizationUri())
                    .clientId(stored.clientId())
                    .redirectUri(stored.redirectUri())
                    .scopes(stored.scopes())
                    .state(stored.state())
                    .additionalParameters(parameters -> parameters.putAll(stored.additionalParameters()))
                    .attributes(attributes -> attributes.putAll(stored.attributes()))
                    .build();
        } catch (IllegalArgumentException | JacksonException exception) {
            return null;
        }
    }

    @Override
    public void saveAuthorizationRequest(
            OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (authorizationRequest == null) {
            clearCookie(request, response);
            return;
        }

        StoredAuthorizationRequest stored = new StoredAuthorizationRequest(
                authorizationRequest.getAuthorizationUri(),
                authorizationRequest.getClientId(),
                authorizationRequest.getRedirectUri(),
                authorizationRequest.getScopes(),
                authorizationRequest.getState(),
                authorizationRequest.getAdditionalParameters(),
                authorizationRequest.getAttributes());
        byte[] payload = objectMapper.writeValueAsBytes(stored);
        String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
        String cookieValue = encodedPayload + "."
                + Base64.getUrlEncoder().withoutPadding().encodeToString(sign(payload));
        if (cookieValue.length() > MAX_COOKIE_VALUE_LENGTH) {
            throw new IllegalStateException("OAuth2 authorization request exceeds cookie size limit");
        }

        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, cookieValue)
                .httpOnly(true)
                .secure(request.isSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(COOKIE_MAX_AGE_SECONDS)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(
            HttpServletRequest request,
            HttpServletResponse response) {
        OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
        clearCookie(request, response);
        return authorizationRequest;
    }

    private String findCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void clearCookie(HttpServletRequest request, HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(request.isSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private byte[] sign(byte[] payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(signingKey);
            return mac.doFinal(payload);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Unable to sign OAuth2 authorization request", exception);
        }
    }

    public record StoredAuthorizationRequest(
            String authorizationUri,
            String clientId,
            String redirectUri,
            Set<String> scopes,
            String state,
            Map<String, Object> additionalParameters,
            Map<String, Object> attributes) {
    }
}
