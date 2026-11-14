package com.warehouse.security;

import com.warehouse.auth.dto.AuthUserResponse;
import com.warehouse.auth.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {
    private final AuthService authService;
    private final JwtService jwtService;
    private final String frontendBaseUrl;

    public GoogleOAuth2SuccessHandler(
            AuthService authService,
            JwtService jwtService,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth
                && oauth.getPrincipal().getAttribute("email") instanceof String email)) {
            throw new ServletException("Google OAuth2 did not provide an email");
        }
        AuthUserResponse user = authService.getCurrentUser(email);
        String token = jwtService.createToken(user).accessToken();
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
            response.addHeader("Set-Cookie", "JSESSIONID=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
        }
        response.sendRedirect(frontendBaseUrl + "/#access_token=" + token);
    }
}
