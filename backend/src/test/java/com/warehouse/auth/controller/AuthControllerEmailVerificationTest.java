package com.warehouse.auth.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.warehouse.auth.service.AuthService;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class AuthControllerEmailVerificationTest {
    private static final String TOKEN = "A".repeat(43);

    @Test
    void openingVerificationLinkDoesNotConsumeToken() {
        AuthService authService = mock(AuthService.class);
        AuthController controller = new AuthController(authService, mock(JwtService.class));

        var response = controller.emailVerificationPage(TOKEN);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("method=\"post\""));
        assertTrue(response.getBody().contains(TOKEN));
        verifyNoInteractions(authService);
    }

    @Test
    void invalidTokenFromVerificationFormShowsBadRequestPage() {
        AuthService authService = mock(AuthService.class);
        doThrow(new BusinessException(
                        HttpStatus.BAD_REQUEST,
                        "INVALID_OR_EXPIRED_VERIFICATION_TOKEN",
                        "Invalid token"))
                .when(authService)
                .verifyEmail(org.mockito.ArgumentMatchers.any());
        AuthController controller = new AuthController(authService, mock(JwtService.class));

        var response = controller.verifyEmailFromLink(TOKEN);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().contains("Liên kết không hợp lệ"));
        verify(authService).verifyEmail(org.mockito.ArgumentMatchers.any());
    }
}
