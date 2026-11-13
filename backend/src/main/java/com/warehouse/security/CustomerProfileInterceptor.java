package com.warehouse.security;

import com.warehouse.common.enums.UserRole;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class CustomerProfileInterceptor implements HandlerInterceptor {
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

    public CustomerProfileInterceptor(CustomerRepository customerRepository, UserRepository userRepository) {
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof SessionPrincipal principal)
                || principal.role() != UserRole.CUSTOMER) {
            return true;
        }
        Long userId = userRepository.findByEmailIgnoreCase(principal.subject())
                .map(user -> user.getId())
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không còn tồn tại"));
        if (!customerRepository.existsByUserId(userId)) {
            throw new BusinessException(
                    HttpStatus.FORBIDDEN,
                    "CUSTOMER_PROFILE_REQUIRED",
                    "Tài khoản chưa có hồ sơ khách hàng");
        }
        return true;
    }
}
