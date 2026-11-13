package com.buy01.users.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    @RestController
    static class FakeController {
        @GetMapping("/conflict")
        void conflict() { throw new ConflictException("Order already shipped"); }

        @GetMapping("/duplicate")
        void duplicate() { throw new DuplicateKeyException("E11000 duplicate key"); }

        @GetMapping("/stale")
        void stale() { throw new OptimisticLockingFailureException("version mismatch"); }

        @GetMapping("/missing")
        void missing() { throw new UserNotFoundException("Not found"); }

        @GetMapping("/forbidden")
        void forbidden() { throw new IllegalArgumentException("Not yours"); }

        @GetMapping("/items/{page}")
        void typed(@PathVariable int page) { }

        @PostMapping("/body")
        void body(@RequestBody Map<String, Object> body) { }

        @GetMapping("/dup-email")
        void dupEmail() { throw new DuplicateEmailException("Email is already in use"); }

        @GetMapping("/boom")
        void boom() { throw new IllegalStateException("secret internal detail"); }
    }

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new FakeController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void duplicateEmailIsStill409() throws Exception {
        mvc.perform(get("/dup-email"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email is already in use"));
    }

    @Test
    void conflictExceptionReturns409WithMessage() throws Exception {
        mvc.perform(get("/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Order already shipped"));
    }

    @Test
    void mongoDuplicateKeyReturns409NotA500() throws Exception {
        mvc.perform(get("/duplicate")).andExpect(status().isConflict());
    }

    @Test
    void optimisticLockReturns409() throws Exception {
        mvc.perform(get("/stale")).andExpect(status().isConflict());
    }

    @Test
    void notFoundReturns404() throws Exception {
        mvc.perform(get("/missing")).andExpect(status().isNotFound());
    }

    @Test
    void illegalArgumentReturns400() throws Exception {
        mvc.perform(get("/forbidden")).andExpect(status().isBadRequest());
    }

    @Test
    void badPathParameterReturns400() throws Exception {
        mvc.perform(get("/items/abc")).andExpect(status().isBadRequest());
    }

    @Test
    void malformedJsonReturns400() throws Exception {
        mvc.perform(post("/body").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void wrongHttpMethodReturns405NotA500() throws Exception {
        mvc.perform(delete("/conflict")).andExpect(status().isMethodNotAllowed());
    }

    @Test
    void wrongContentTypeReturns415NotA500() throws Exception {
        mvc.perform(post("/body").contentType(MediaType.TEXT_PLAIN).content("hi"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void unexpectedErrorReturns500WithoutLeakingDetails() throws Exception {
        mvc.perform(get("/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("secret"))));
    }
}
