package com.warehouse.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;

@Configuration
public class JwtConfiguration {
    @Bean
    public SecretKey jwtSecretKey(@Value("${app.jwt.secret:}") String secret) {
        byte[] key = secret.getBytes(StandardCharsets.UTF_8);
        if (key.length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        return new SecretKeySpec(key, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
    }

    @Bean
    public JwtDecoder jwtDecoder(
            SecretKey jwtSecretKey,
            @Value("${app.jwt.issuer:warehouse-api}") String issuer) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSecretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
        return decoder;
    }

    @Bean
    public Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter(
            UserRepository userRepository) {
        return jwt -> {
            UserRole role;
            try {
                role = UserRole.valueOf(jwt.getClaimAsString("role"));
            } catch (RuntimeException exception) {
                throw new BadCredentialsException("JWT role claim is invalid", exception);
            }
            Long userId;
            try {
                userId = Long.valueOf(jwt.getSubject());
            } catch (RuntimeException exception) {
                throw new BadCredentialsException("JWT subject must be a user ID", exception);
            }
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new BadCredentialsException("JWT subject does not identify a user"));
            if (user.getStatus() == UserStatus.LOCKED) {
                throw new AccountLockedAuthenticationException();
            }
            SessionPrincipal principal = new SessionPrincipal(user.getEmail(), role);
            return UsernamePasswordAuthenticationToken.authenticated(
                    principal, jwt, List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
        };
    }
}
