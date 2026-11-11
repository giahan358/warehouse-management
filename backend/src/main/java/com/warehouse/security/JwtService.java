package com.warehouse.security;

import com.warehouse.auth.dto.AuthTokenResponse;
import com.warehouse.auth.dto.AuthUserResponse;
import java.time.Instant;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final JwtEncoder jwtEncoder;
    private final long expirationSeconds;
    private final String issuer;

    public JwtService(
            JwtEncoder jwtEncoder,
            @Value("${app.jwt.expiration-seconds:3600}") long expirationSeconds,
            @Value("${app.jwt.issuer:warehouse-api}") String issuer) {
        if (expirationSeconds <= 0) {
            throw new IllegalArgumentException("JWT_EXPIRATION_SECONDS must be positive");
        }
        this.jwtEncoder = jwtEncoder;
        this.expirationSeconds = expirationSeconds;
        this.issuer = issuer;
    }

    public AuthTokenResponse createToken(AuthUserResponse user) {
        Objects.requireNonNull(user, "user");
        Instant issuedAt = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plusSeconds(expirationSeconds))
                .subject(user.email())
                .claim("role", user.role().name())
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new AuthTokenResponse(token, "Bearer", expirationSeconds, user);
    }
}
