package com.warehouse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import jakarta.servlet.http.Cookie;
import com.warehouse.auth.dto.AuthUserResponse;
import com.warehouse.auth.dto.RegisterRequest;
import com.warehouse.auth.service.AuthService;
import com.warehouse.auth.service.EmailVerificationService;
import com.warehouse.common.enums.InboundStatus;
import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.response.ApiErrorResponse;
import com.warehouse.customer.dto.CustomerResponse;
import com.warehouse.customer.dto.UpdateCustomerRequest;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerProjection;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.customer.service.CustomerServiceImpl;
import com.warehouse.inbound.dto.InboundItemRequest;
import com.warehouse.inbound.dto.InboundDiscrepancyReportResponse;
import com.warehouse.inbound.dto.UpdateInboundItemRequest;
import com.warehouse.inbound.model.InboundReceipt;
import com.warehouse.inbound.model.InboundReceiptItem;
import com.warehouse.inbound.repository.InboundReceiptItemProjection;
import com.warehouse.inbound.repository.InboundReceiptItemRepository;
import com.warehouse.inbound.repository.InboundReceiptRepository;
import com.warehouse.inbound.service.InboundReceiptServiceImpl;
import com.warehouse.inventory.repository.InventoryRepository;
import com.warehouse.invoice.repository.InvoiceRepository;
import com.warehouse.product.model.Product;
import com.warehouse.product.dto.UpdateProductRequest;
import com.warehouse.product.repository.ProductRepository;
import com.warehouse.product.service.ProductServiceImpl;
import com.warehouse.security.AccountLockedAuthenticationException;
import com.warehouse.security.ApiAuthenticationEntryPoint;
import com.warehouse.security.JwtConfiguration;
import com.warehouse.security.JwtService;
import com.warehouse.security.OAuth2AuthorizationRequestCookieRepository;
import com.warehouse.security.SessionPrincipal;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import com.warehouse.user.service.AccountInvitationService;
import com.warehouse.user.service.UserServiceImpl;
import com.warehouse.user.dto.CreateUserRequest;
import java.sql.SQLException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.convert.converter.Converter;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
		"app.jwt.secret=test-secret-that-is-long-enough-for-hs256",
		"app.google.oauth-enabled=true",
		"app.google.client-id=test-google-client-id",
		"app.google.client-secret=test-google-client-secret"
})
class WarehouseApplicationTests {
	private static final String EMAIL = "customer@example.com";
	private static final Long USER_ID = 5L;
	private static final String OAUTH2_STATE_COOKIE = "OAUTH2_AUTH_REQUEST";

	@Autowired
	private OAuth2AuthorizationRequestCookieRepository authorizationRequestRepository;

	@Autowired
	private MockMvc mockMvc;

	@Test
	void contextLoads() {
	}

	@Test
	void lockedAccountIsRejectedWhenJwtIsAuthenticated() {
		UserRepository userRepository = mock(UserRepository.class);
		User user = new User();
		user.setEmail(EMAIL);
		user.setStatus(UserStatus.LOCKED);
		when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

		Converter<Jwt, ? extends AbstractAuthenticationToken> converter =
				new JwtConfiguration().jwtAuthenticationConverter(userRepository);

		assertThrows(AccountLockedAuthenticationException.class, () -> converter.convert(jwt()));
	}

	@Test
	void activeAccountCanStillAuthenticateWithJwt() {
		UserRepository userRepository = mock(UserRepository.class);
		User user = new User();
		user.setEmail(EMAIL);
		user.setStatus(UserStatus.ACTIVE);
		when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

		Converter<Jwt, ? extends AbstractAuthenticationToken> converter =
				new JwtConfiguration().jwtAuthenticationConverter(userRepository);

		AbstractAuthenticationToken authentication = converter.convert(jwt());

		assertNotNull(authentication);
		assertEquals("ROLE_CUSTOMER", authentication.getAuthorities().iterator().next().getAuthority());
		assertEquals(EMAIL, ((SessionPrincipal) authentication.getPrincipal()).getSubject());
		verify(userRepository).findById(USER_ID);
	}

	@Test
	void issuedJwtUsesUserIdAsSubject() {
		JwtConfiguration configuration = new JwtConfiguration();
		var secret = configuration.jwtSecretKey("test-secret-that-is-long-enough-for-hs256");
		JwtService jwtService = new JwtService(
				configuration.jwtEncoder(secret),
				3600,
				"warehouse-api");
		AuthUserResponse user = new AuthUserResponse(
				USER_ID,
				"Test Customer",
				EMAIL,
				null,
				UserRole.CUSTOMER,
				UserStatus.ACTIVE,
				LoginMethod.EMAIL,
				true,
				null,
				null,
				null,
				false);

		String token = jwtService.createToken(user).accessToken();
		Jwt decoded = configuration.jwtDecoder(secret, "warehouse-api").decode(token);

		assertEquals(USER_ID.toString(), decoded.getSubject());
	}

	@Test
	void googleOAuthStateUsesSignedCookieWithoutCreatingSession() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		OAuth2AuthorizationRequest authorizationRequest = OAuth2AuthorizationRequest.authorizationCode()
				.authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
				.clientId("google-client-id")
				.redirectUri("http://localhost:8080/login/oauth2/code/google")
				.scopes(Set.of("email", "profile"))
				.state("oauth-state-value")
				.attributes(attributes -> attributes.put(OAuth2ParameterNames.REGISTRATION_ID, "google"))
				.build();

		authorizationRequestRepository.saveAuthorizationRequest(authorizationRequest, request, response);

		String setCookie = response.getHeader("Set-Cookie");
		assertNotNull(setCookie);
		assertNull(request.getSession(false));
		assertTrue(setCookie.startsWith(
				OAUTH2_STATE_COOKIE + "="));
		assertTrue(setCookie.contains("HttpOnly"));
		assertTrue(setCookie.contains("SameSite=Lax"));
		assertTrue(setCookie.indexOf("JSESSIONID") < 0);

		String cookieValue = setCookie.substring(
				setCookie.indexOf('=') + 1,
				setCookie.indexOf(';'));
		MockHttpServletRequest callbackRequest = new MockHttpServletRequest();
		callbackRequest.setCookies(new Cookie(
				OAUTH2_STATE_COOKIE,
				cookieValue));
		OAuth2AuthorizationRequest restored =
				authorizationRequestRepository.loadAuthorizationRequest(callbackRequest);

		assertNotNull(restored);
		assertEquals("oauth-state-value", restored.getState());
		assertEquals("google", restored.getAttribute(OAuth2ParameterNames.REGISTRATION_ID));

		String alteredCookieValue = (cookieValue.startsWith("A") ? "B" : "A")
				+ cookieValue.substring(1);
		callbackRequest.setCookies(new Cookie(
				OAUTH2_STATE_COOKIE,
				alteredCookieValue));
		assertNull(authorizationRequestRepository.loadAuthorizationRequest(callbackRequest));
	}

	@Test
	void googleOAuthRedirectDoesNotCreateSessionCookie() throws Exception {
		MvcResult result = mockMvc.perform(get("/oauth2/authorization/google")).andReturn();

		assertEquals(302, result.getResponse().getStatus());
		assertTrue(result.getResponse().getRedirectedUrl().startsWith("https://accounts.google.com/"));
		assertNull(result.getRequest().getSession(false));
		assertTrue(result.getResponse().getHeaders("Set-Cookie").stream()
				.anyMatch(cookie -> cookie.startsWith(OAUTH2_STATE_COOKIE + "=")));
		assertTrue(result.getResponse().getHeaders("Set-Cookie").stream()
				.noneMatch(cookie -> cookie.startsWith("JSESSIONID=")));
	}

	@Test
	void lockedAccountReturnsForbiddenAccountLockedError() throws Exception {
		ObjectMapper objectMapper = mock(ObjectMapper.class);
		ApiAuthenticationEntryPoint entryPoint = new ApiAuthenticationEntryPoint(objectMapper);
		MockHttpServletResponse response = new MockHttpServletResponse();

		entryPoint.commence(
				new MockHttpServletRequest(),
				response,
				new AccountLockedAuthenticationException());

		assertEquals(403, response.getStatus());
		verify(objectMapper).writeValue(
				org.mockito.ArgumentMatchers.eq(response.getOutputStream()),
				org.mockito.ArgumentMatchers.argThat(value ->
						value instanceof ApiErrorResponse error
								&& "ACCOUNT_LOCKED".equals(error.error().code())));
	}

	@Test
	void addingInboundItemRejectsCapacityExceeded() {
		InboundFixture fixture = inboundFixture("3", "5", "1");

		BusinessException exception = assertThrows(
				BusinessException.class,
				() -> fixture.service().addItem(
						1L, EMAIL, new InboundItemRequest(3L, new BigDecimal("2"))));

		assertEquals("CAPACITY_EXCEEDED", exception.getCode());
		verify(fixture.customerRepository()).findLockedById(2L);
		verify(fixture.itemRepository(), org.mockito.Mockito.never()).saveAndFlush(
				org.mockito.ArgumentMatchers.any());
	}

	@Test
	void increasingInboundItemRejectsCapacityExceeded() {
		InboundFixture fixture = inboundFixture("3", "6", "1");

		BusinessException exception = assertThrows(
				BusinessException.class,
				() -> fixture.service().updateItem(
						1L, 4L, EMAIL, new UpdateInboundItemRequest(new BigDecimal("2"))));

		assertEquals("CAPACITY_EXCEEDED", exception.getCode());
		verify(fixture.customerRepository()).findLockedById(2L);
		verify(fixture.itemRepository(), org.mockito.Mockito.never()).saveAndFlush(
				org.mockito.ArgumentMatchers.any());
	}

	@Test
	void updatingProductDimensionsRejectsCapacityOverflowFromExistingStock() {
		ProductRepository productRepository = mock(ProductRepository.class);
		CustomerRepository customerRepository = mock(CustomerRepository.class);
		UserRepository userRepository = mock(UserRepository.class);
		Customer customer = mock(Customer.class);
		when(customer.getId()).thenReturn(2L);
		when(customer.getCapacityM3()).thenReturn(new BigDecimal("1.50"));
		when(customerRepository.findLockedById(2L)).thenReturn(Optional.of(customer));
		when(customerRepository.sumStoredVolume(2L)).thenReturn(BigDecimal.ONE);
		when(customerRepository.sumReservedInboundVolume(2L)).thenReturn(BigDecimal.ZERO);
		when(customerRepository.sumStoredQuantityByProduct(2L, 3L)).thenReturn(new BigDecimal("2"));
		when(customerRepository.sumReservedQuantityByProduct(2L, 3L)).thenReturn(BigDecimal.ZERO);

		var productView = mock(com.warehouse.product.repository.ProductProjection.class);
		when(productView.getCustomerId()).thenReturn(2L);
		when(productRepository.findProductViewById(3L)).thenReturn(Optional.of(productView));
		Product product = mock(Product.class);
		when(product.getId()).thenReturn(3L);
		when(product.getCustomerId()).thenReturn(2L);
		when(product.getVolumeM3()).thenReturn(new BigDecimal("0.50"));
		when(productRepository.findLockedById(3L)).thenReturn(Optional.of(product));
		when(productRepository.existsByCustomerIdAndSkuIgnoreCaseAndIdNot(2L, "SKU-1", 3L))
				.thenReturn(false);
		ProductServiceImpl service = new ProductServiceImpl(
				productRepository, customerRepository, userRepository);

		BusinessException exception = assertThrows(
				BusinessException.class,
				() -> service.update(
						3L,
						"admin@example.com",
						UserRole.ADMIN.name(),
						new UpdateProductRequest(
								"SKU-1",
								null,
								"Product",
								null,
								null,
								"unit",
								new BigDecimal("100"),
								new BigDecimal("100"),
								new BigDecimal("100"))));

		assertEquals("CAPACITY_EXCEEDED", exception.getCode());
		verify(productRepository, org.mockito.Mockito.never()).saveAndFlush(
				org.mockito.ArgumentMatchers.any());
	}

	@Test
	void adminCannotReduceCapacityBelowCurrentAndReservedVolume() {
		CustomerRepository customerRepository = mock(CustomerRepository.class);
		Customer customer = mock(Customer.class);
		when(customerRepository.findLockedById(2L)).thenReturn(Optional.of(customer));
		when(customerRepository.sumStoredVolume(2L)).thenReturn(new BigDecimal("2.50"));
		when(customerRepository.sumReservedInboundVolume(2L)).thenReturn(BigDecimal.ONE);
		CustomerServiceImpl service = new CustomerServiceImpl(
				customerRepository,
				mock(UserRepository.class));

		BusinessException exception = assertThrows(
				BusinessException.class,
				() -> service.update(
						2L,
						new UpdateCustomerRequest(
								"Business",
								"0123456789",
								"Address",
								null,
								null,
								null,
								com.warehouse.common.enums.ServicePackage.STANDARD,
								new BigDecimal("3.00"),
								null,
								null,
								null)));

		assertEquals("CAPACITY_EXCEEDED", exception.getCode());
		verify(customerRepository, org.mockito.Mockito.never()).save(
				org.mockito.ArgumentMatchers.any(Customer.class));
	}

	@Test
	void updatingInboundItemRejectsHiddenProduct() {
		InboundFixture fixture = inboundFixture("0", "0", "1");
		Product hiddenProduct = mock(Product.class);
		when(hiddenProduct.getId()).thenReturn(3L);
		when(hiddenProduct.getCustomerId()).thenReturn(2L);
		when(hiddenProduct.getStatus()).thenReturn(com.warehouse.common.enums.ProductStatus.HIDDEN);
		when(hiddenProduct.getVolumeM3()).thenReturn(new BigDecimal("2"));
		when(fixture.productRepository().findById(3L)).thenReturn(Optional.of(hiddenProduct));

		BusinessException exception = assertThrows(
				BusinessException.class,
				() -> fixture.service().updateItem(
						1L, 4L, EMAIL, new UpdateInboundItemRequest(new BigDecimal("2"))));

		assertEquals("VALIDATION_ERROR", exception.getCode());
		verify(fixture.customerRepository(), org.mockito.Mockito.never()).findLockedById(2L);
		verify(fixture.itemRepository(), org.mockito.Mockito.never()).saveAndFlush(
				org.mockito.ArgumentMatchers.any());
	}

	@Test
	void discrepancyReportDoesNotCountDamagedUnitsAsShortageTwice() {
		InboundFixture fixture = inboundFixture("0", "0", "1");
		InboundReceiptItemProjection item = discrepancyItem("200", "196", "4");
		when(fixture.itemRepository().findItemViews(1L)).thenReturn(List.of(item));

		InboundDiscrepancyReportResponse report =
				fixture.service().getDiscrepancyReport(1L, EMAIL, "CUSTOMER");

		assertEquals(BigDecimal.ZERO, report.totalShortage());
		assertEquals(new BigDecimal("4"), report.totalDamaged());
	}

	@Test
	void discrepancyReportCountsOnlyShortageBeyondDamagedUnits() {
		InboundFixture fixture = inboundFixture("0", "0", "1");
		InboundReceiptItemProjection item = discrepancyItem("200", "190", "4");
		when(fixture.itemRepository().findItemViews(1L)).thenReturn(List.of(item));

		InboundDiscrepancyReportResponse report =
				fixture.service().getDiscrepancyReport(1L, EMAIL, "CUSTOMER");

		assertEquals(new BigDecimal("6"), report.totalShortage());
		assertEquals(new BigDecimal("4"), report.totalDamaged());
	}

	@Test
	void discrepancyReportSerializesContractFieldNames() throws Exception {
		InboundDiscrepancyReportResponse report = new InboundDiscrepancyReportResponse(
				1L, "NK-202611-test", BigDecimal.ONE, new BigDecimal("2"), List.of());

		String json = new ObjectMapper().writeValueAsString(report);

		assertTrue(json.contains("\"totalShortage\":1"));
		assertTrue(json.contains("\"totalDamaged\":2"));
		assertFalse(json.contains("\"shortageTotal\""));
		assertFalse(json.contains("\"damagedTotal\""));
	}

	@Test
	void customerResponseUsesContractCapacityCalculations() {
		CustomerProjection projection = mock(CustomerProjection.class);
		when(projection.getCapacityM3()).thenReturn(new BigDecimal("3.00"));
		when(projection.getUsedM3()).thenReturn(BigDecimal.ONE);
		when(projection.getReservedInboundM3()).thenReturn(new BigDecimal("3.00"));
		when(projection.getServicePackage()).thenReturn("STANDARD");
		when(projection.getFeeStatus()).thenReturn("PAID");
		when(projection.getAccountStatus()).thenReturn("ACTIVE");
		when(projection.getLoginMethod()).thenReturn("EMAIL");

		CustomerResponse response = CustomerResponse.from(projection);

		assertEquals(new BigDecimal("-1.00"), response.remainingM3());
		assertEquals(new BigDecimal("33.3"), response.usedPercent());
	}

	@Test
	void concurrentEmailRegistrationConflictReturnsEmailAlreadyExists() {
		UserRepository userRepository = mock(UserRepository.class);
		when(userRepository.existsByEmailIgnoreCase("new.customer@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(User.class)))
				.thenThrow(duplicateEmailException());
		AuthService authService = new AuthService(
				userRepository,
				mock(CustomerRepository.class),
				mock(PasswordEncoder.class),
				mock(AccountInvitationService.class),
				mock(EmailVerificationService.class));

		BusinessException exception = assertThrows(
				BusinessException.class,
				() -> authService.register(new RegisterRequest(
						"New Customer", "new.customer@example.com", "password123", null)));

		assertEquals(409, exception.getStatus().value());
		assertEquals("EMAIL_ALREADY_EXISTS", exception.getCode());
	}

	@Test
	void concurrentStaffEmailConflictReturnsEmailAlreadyExists() {
		UserRepository userRepository = mock(UserRepository.class);
		when(userRepository.existsByEmailIgnoreCase("new.staff@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(User.class)))
				.thenThrow(duplicateEmailException());
		UserServiceImpl userService = new UserServiceImpl(
				userRepository,
				mock(PasswordEncoder.class));

		BusinessException exception = assertThrows(
				BusinessException.class,
				() -> userService.create(new CreateUserRequest(
						"New Staff",
						"new.staff@example.com",
						UserRole.WAREHOUSE_STAFF,
						null,
						"password123")));

		assertEquals(409, exception.getStatus().value());
		assertEquals("EMAIL_ALREADY_EXISTS", exception.getCode());
	}

	private DataIntegrityViolationException duplicateEmailException() {
		return new DataIntegrityViolationException(
				"duplicate email",
				new SQLException("Duplicate entry for key 'users.email'", "23000", 1062));
	}

	private InboundReceiptItemProjection discrepancyItem(String expected, String actual, String damaged) {
		InboundReceiptItemProjection item = mock(InboundReceiptItemProjection.class);
		when(item.getExpectedQuantity()).thenReturn(new BigDecimal(expected));
		when(item.getActualQuantity()).thenReturn(new BigDecimal(actual));
		when(item.getDamagedQuantity()).thenReturn(new BigDecimal(damaged));
		return item;
	}

	private InboundFixture inboundFixture(String storedVolume, String reservedVolume, String itemQuantity) {
		InboundReceiptRepository receiptRepository = mock(InboundReceiptRepository.class);
		InboundReceiptItemRepository itemRepository = mock(InboundReceiptItemRepository.class);
		CustomerRepository customerRepository = mock(CustomerRepository.class);
		ProductRepository productRepository = mock(ProductRepository.class);
		UserRepository userRepository = mock(UserRepository.class);
		InventoryRepository inventoryRepository = mock(InventoryRepository.class);
		InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);

		User user = new User();
		user.setId(5L);
		Customer customer = mock(Customer.class);
		when(customer.getId()).thenReturn(2L);
		when(customer.getCapacityM3()).thenReturn(new BigDecimal("10"));
		when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
		when(customerRepository.findByUserId(5L)).thenReturn(Optional.of(customer));
		when(customerRepository.findLockedById(2L)).thenReturn(Optional.of(customer));
		when(customerRepository.sumStoredVolume(2L)).thenReturn(new BigDecimal(storedVolume));
		when(customerRepository.sumReservedInboundVolume(2L)).thenReturn(new BigDecimal(reservedVolume));

		InboundReceipt receipt = new InboundReceipt();
		receipt.setCustomerId(2L);
		receipt.setStatus(InboundStatus.SCHEDULED);
		when(receiptRepository.findById(1L)).thenReturn(Optional.of(receipt));
		when(receiptRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(receipt));

		Product product = mock(Product.class);
		when(product.getId()).thenReturn(3L);
		when(product.getCustomerId()).thenReturn(2L);
		when(product.getStatus()).thenReturn(com.warehouse.common.enums.ProductStatus.ACTIVE);
		when(product.getVolumeM3()).thenReturn(new BigDecimal("2"));
		when(productRepository.findById(3L)).thenReturn(Optional.of(product));
		when(itemRepository.findByReceiptIdAndProductId(1L, 3L)).thenReturn(Optional.empty());

		InboundReceiptItem item = new InboundReceiptItem();
		item.setProductId(3L);
		item.setExpectedQuantity(new BigDecimal(itemQuantity));
		when(itemRepository.findByIdAndReceiptId(4L, 1L)).thenReturn(Optional.of(item));

		InboundReceiptServiceImpl service = new InboundReceiptServiceImpl(
				receiptRepository,
				itemRepository,
				customerRepository,
				productRepository,
				userRepository,
				inventoryRepository,
				invoiceRepository);
		return new InboundFixture(service, customerRepository, itemRepository, productRepository);
	}

	private record InboundFixture(
			InboundReceiptServiceImpl service,
			CustomerRepository customerRepository,
			InboundReceiptItemRepository itemRepository,
			ProductRepository productRepository) {
	}

	private Jwt jwt() {
		Instant now = Instant.now();
		return Jwt.withTokenValue("token")
				.header("alg", "HS256")
				.subject(USER_ID.toString())
				.issuedAt(now)
				.expiresAt(now.plusSeconds(60))
				.claim("role", UserRole.CUSTOMER.name())
				.build();
	}
}
