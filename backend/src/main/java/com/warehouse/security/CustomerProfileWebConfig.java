package com.warehouse.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CustomerProfileWebConfig implements WebMvcConfigurer {
    private final CustomerProfileInterceptor customerProfileInterceptor;

    public CustomerProfileWebConfig(CustomerProfileInterceptor customerProfileInterceptor) {
        this.customerProfileInterceptor = customerProfileInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(customerProfileInterceptor).addPathPatterns(
                "/api/v1/customers/me",
                "/api/v1/products/**",
                "/api/v1/inventory/**",
                "/api/v1/inbound-receipts/**",
                "/api/v1/outbound-orders/**",
                "/api/v1/invoices/**",
                "/api/v1/payments/**",
                "/api/v1/cod/**",
                "/api/v1/dashboard/customer/**");
    }
}
