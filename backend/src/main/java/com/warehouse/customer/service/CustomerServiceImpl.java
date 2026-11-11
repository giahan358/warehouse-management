package com.warehouse.customer.service;

import com.warehouse.common.enums.CustomerFeeStatus;
import com.warehouse.common.enums.ServicePackage;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.common.util.EnumParser;
import com.warehouse.customer.dto.CreateCustomerRequest;
import com.warehouse.customer.dto.CustomerListResponse;
import com.warehouse.customer.dto.CustomerResponse;
import com.warehouse.customer.dto.UpdateCustomerRequest;
import com.warehouse.customer.dto.UpdateMyCustomerRequest;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerProjection;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerServiceImpl implements CustomerService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_PAGE_SIZE = 100;

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

    public CustomerServiceImpl(CustomerRepository customerRepository, UserRepository userRepository) {
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CustomerListResponse> getCustomers(
            String keyword,
            String servicePackage,
            String feeStatus,
            String accountStatus,
            Pageable pageable) {
        validatePageable(pageable);
        Page<CustomerProjection> result = customerRepository.searchCustomers(
                normalizeKeyword(keyword),
                EnumParser.parseFilter(servicePackage, ServicePackage.class, "servicePackage"),
                EnumParser.parseFilter(feeStatus, CustomerFeeStatus.class, "feeStatus"),
                EnumParser.parseFilter(accountStatus, UserStatus.class, "accountStatus"),
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
        return PageResponse.from(result.map(CustomerListResponse::from));
    }

    @Override
    @Transactional
    public CustomerResponse create(CreateCustomerRequest request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản " + request.userId()));
        if (user.getRole() != UserRole.CUSTOMER) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Chỉ có thể liên kết hồ sơ với tài khoản CUSTOMER");
        }
        if (customerRepository.existsByUserId(user.getId())) {
            throw new BusinessException(
                    HttpStatus.CONFLICT, "CUSTOMER_PROFILE_ALREADY_EXISTS", "Tài khoản đã có hồ sơ khách hàng");
        }

        Customer customer = new Customer();
        customer.setUserId(user.getId());
        customer.setCustomerCode(generateCustomerCode());
        customer.setBusinessName(request.businessName().trim());
        customer.setPhone(request.phone().trim());
        customer.setAddress(request.address().trim());
        customer.setTaxCode(blankToNull(request.taxCode()));
        customer.setLegalRepresentative(blankToNull(request.legalRepresentative()));
        customer.setBillingEmail(blankToNull(request.billingEmail()));
        customer.setServicePackage(request.servicePackage() == null
                ? ServicePackage.STANDARD
                : request.servicePackage());
        customer.setCapacityM3(request.capacityM3() == null ? BigDecimal.ZERO : request.capacityM3());
        customer.setCreatedAt(LocalDateTime.now(BUSINESS_ZONE));
        Customer saved = customerRepository.save(customer);
        return findDetails(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getById(Long id) {
        return findDetails(id);
    }

    @Override
    @Transactional
    public CustomerResponse update(Long id, UpdateCustomerRequest request) {
        Customer customer = customerRepository.findById(id).orElseThrow(() -> customerNotFound(id));
        applyCommonFields(
                customer,
                request.businessName(),
                request.phone(),
                request.address(),
                request.legalRepresentative(),
                request.billingEmail(),
                request.bankName(),
                request.bankAccountNumber(),
                request.bankAccountHolder());
        customer.setTaxCode(blankToNull(request.taxCode()));
        customer.setServicePackage(request.servicePackage());
        customer.setCapacityM3(request.capacityM3());
        customerRepository.save(customer);
        return findDetails(id);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getMe(String email) {
        return customerRepository.findCustomerDetailsByUserEmail(email)
                .map(CustomerResponse::from)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "CUSTOMER_PROFILE_NOT_FOUND", "Tài khoản chưa có hồ sơ khách hàng"));
    }

    @Override
    @Transactional
    public CustomerResponse updateMe(String email, UpdateMyCustomerRequest request) {
        Customer customer = customerRepository.findByUserId(findCurrentCustomerUserId(email))
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "CUSTOMER_PROFILE_NOT_FOUND", "Tài khoản chưa có hồ sơ khách hàng"));
        applyCommonFields(
                customer,
                request.businessName(),
                request.phone(),
                request.address(),
                request.legalRepresentative(),
                request.billingEmail(),
                request.bankName(),
                request.bankAccountNumber(),
                request.bankAccountHolder());
        customerRepository.save(customer);
        return findDetails(customer.getId());
    }

    private Long findCurrentCustomerUserId(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> user.getId())
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không còn tồn tại"));
    }

    private CustomerResponse findDetails(Long id) {
        return customerRepository.findCustomerDetailsById(id)
                .map(CustomerResponse::from)
                .orElseThrow(() -> customerNotFound(id));
    }

    private void applyCommonFields(
            Customer customer,
            String businessName,
            String phone,
            String address,
            String legalRepresentative,
            String billingEmail,
            String bankName,
            String bankAccountNumber,
            String bankAccountHolder) {
        customer.setBusinessName(businessName.trim());
        customer.setPhone(phone.trim());
        customer.setAddress(address.trim());
        customer.setLegalRepresentative(blankToNull(legalRepresentative));
        customer.setBillingEmail(blankToNull(billingEmail));
        customer.setBankName(blankToNull(bankName));
        customer.setBankAccountNumber(blankToNull(bankAccountNumber));
        customer.setBankAccountHolder(blankToNull(bankAccountHolder));
    }

    private String generateCustomerCode() {
        return "CUST-VN" + UUID.randomUUID().toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeKeyword(String keyword) {
        return keyword == null || keyword.isBlank() ? null : keyword.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "page phải >= 0 và size phải từ 1 đến 100");
        }
    }

    private BusinessException customerNotFound(Long id) {
        return new BusinessException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng " + id);
    }
}
