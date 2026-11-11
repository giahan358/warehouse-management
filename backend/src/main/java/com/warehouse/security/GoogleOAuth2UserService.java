package com.warehouse.security;

import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
    private final UserRepository userRepository;

    public GoogleOAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User googleUser = delegate.loadUser(request);
        Object verified = googleUser.getAttribute("email_verified");
        if (verified == null) {
            verified = googleUser.getAttribute("verified_email");
        }
        String googleId = googleUser.getAttribute("sub");
        String rawEmail = googleUser.getAttribute("email");
        if (!Boolean.TRUE.equals(verified) || googleId == null || rawEmail == null || rawEmail.isBlank()) {
            throw oauthError("google_account_unverified");
        }

        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setFullName(googleUser.getAttribute("name") == null
                    ? email
                    : googleUser.getAttribute("name"));
            newUser.setEmail(email);
            newUser.setGoogleId(googleId);
            newUser.setLoginMethod(LoginMethod.GOOGLE);
            newUser.setRole(UserRole.CUSTOMER);
            newUser.setStatus(UserStatus.ACTIVE);
            newUser.setCreatedAt(LocalDateTime.now(BUSINESS_ZONE));
            return userRepository.save(newUser);
        });

        if (user.getGoogleId() != null && !user.getGoogleId().equals(googleId)) {
            throw oauthError("google_account_link_conflict");
        }
        if (user.getGoogleId() == null) {
            user.setGoogleId(googleId);
            userRepository.save(user);
        }
        if (user.getStatus() == UserStatus.LOCKED) {
            throw oauthError("account_locked");
        }
        return googleUser;
    }

    private OAuth2AuthenticationException oauthError(String code) {
        return new OAuth2AuthenticationException(new OAuth2Error(code));
    }
}
