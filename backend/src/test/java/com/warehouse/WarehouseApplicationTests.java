package com.warehouse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = "app.jwt.secret=test-secret-that-is-long-enough-for-hs256")
class WarehouseApplicationTests {

	@Test
	void contextLoads() {
	}

}
