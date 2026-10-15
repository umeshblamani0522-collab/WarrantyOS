package com.wp;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepo users;
    private final CustomerRepo customers;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final AuthTokenRepo tokens;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String mailMode;

    public AuthController(UserRepo users, CustomerRepo customers, PasswordEncoder encoder,
                          JwtService jwtService, AuthTokenRepo tokens, MailService mailService,
                          @Value("${app.mail-mode:smtp}") String mailMode) {
        this.users = users;
        this.customers = customers;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.tokens = tokens;
        this.mailService = mailService;
        this.mailMode = mailMode;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody(required = false) Map<String, String> request) {
        String email = request == null ? null : request.get("email");
        String password = request == null ? null : request.get("password");
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return bad("Email and password are required.");
        }

        String normalizedEmail;
        try {
            normalizedEmail = ValidationUtil.email(email);
        } catch (Exception ignored) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email or password."));
        }

        AppUser user = users.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (user == null || !encoder.matches(password, user.passwordHash)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email or password."));
        }
        if ("CUSTOMER".equalsIgnoreCase(user.role) && !user.emailVerified) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Please verify your email address before signing in."));
        }

        String token = jwtService.generate(user.email, user.role, user.id);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("id", user.id);
        response.put("name", user.name);
        response.put("email", user.email);
        response.put("role", user.role);
        response.put("customerId", user.customerId);
        response.put("emailVerified", user.emailVerified);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@RequestBody(required = false) Map<String, String> request) {
        String name = value(request, "name");
        String email;
        String phone = value(request, "phone");
        String password = request == null ? null : request.get("password");
        String confirmPassword = request == null ? null : request.get("confirmPassword");

        try {
            name = ValidationUtil.name(name);
            email = ValidationUtil.email(value(request, "email"));
            phone = ValidationUtil.optionalPhone(phone);
            ValidationUtil.password(password);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return bad(e.getReason());
        }

        if (!password.equals(confirmPassword)) return bad("Passwords do not match.");
        if (users.findByEmailIgnoreCase(email).isPresent() || customers.findByEmailIgnoreCase(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "An account with this email already exists."));
        }

        Customer customer = new Customer();
        customer.name = name;
        customer.email = email;
        customer.phone = phone;
        customer = customers.save(customer);

        AppUser user = new AppUser();
        user.name = name;
        user.email = email;
        user.passwordHash = encoder.encode(password);
        user.role = "CUSTOMER";
        user.customerId = customer.id;
        user.emailVerified = false;
        user = users.save(user);

        String token = issueToken(user.id, "VERIFY", 24);
        try {
            mailService.sendVerification(email, name, token);
        } catch (IllegalStateException ex) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", mailService.isSmtpMode()
                ? "Account created. A verification email has been sent to your email address. Please check your inbox."
                : "Account created. In local development, use the verification link shown below or in the backend console.");
        response.put("email", email);
        if (!mailService.isSmtpMode()) response.put("verificationUrl", mailService.verificationUrl(token));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/verify")
    @Transactional
    public ResponseEntity<?> verify(@RequestParam String token) {
        AuthToken authToken = tokens.findActive(hash(token), "VERIFY").orElse(null);
        if (authToken == null) return bad("This verification link is invalid or has expired.");
        AppUser user = users.findById(authToken.userId).orElse(null);
        if (user == null) return bad("The account for this verification link no longer exists.");
        user.emailVerified = true;
        users.save(user);
        authToken.used = true;
        tokens.save(authToken);
        return ResponseEntity.ok(Map.of("message", "Email verified successfully. You can now sign in."));
    }

    @PostMapping("/resend-verification")
    @Transactional
    public ResponseEntity<?> resendVerification(@RequestBody(required = false) Map<String, String> request) {
        String email;
        try { email = ValidationUtil.email(value(request, "email")); }
        catch (org.springframework.web.server.ResponseStatusException e) { return bad(e.getReason()); }
        AppUser user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || !"CUSTOMER".equalsIgnoreCase(user.role)) {
            return ResponseEntity.ok(Map.of("message", "If the account exists, a verification link has been issued."));
        }
        if (user.emailVerified) return ResponseEntity.ok(Map.of("message", "This account is already verified."));
        String token = issueToken(user.id, "VERIFY", 24);
        try {
            mailService.sendVerification(user.email, user.name, token);
        } catch (IllegalStateException ex) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
        }
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", mailService.isSmtpMode()
                ? "A new verification email has been sent. Please check your inbox."
                : "A new verification link has been issued for local development.");
        if (!mailService.isSmtpMode()) response.put("verificationUrl", mailService.verificationUrl(token));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    @Transactional
    public ResponseEntity<?> forgotPassword(@RequestBody(required = false) Map<String, String> request) {
        String email;
        try { email = ValidationUtil.email(value(request, "email")); }
        catch (org.springframework.web.server.ResponseStatusException e) { return bad(e.getReason()); }
        AppUser user = users.findByEmailIgnoreCase(email).orElse(null);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "If the account exists, password reset instructions have been issued.");
        if (user != null) {
            String token = issueToken(user.id, "RESET", 1);
            try {
                mailService.sendPasswordReset(user.email, user.name, token);
            } catch (IllegalStateException ex) {
                throw new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
            }
            if (!mailService.isSmtpMode()) response.put("resetUrl", mailService.resetUrl(token));
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<?> resetPassword(@RequestBody(required = false) Map<String, String> request) {
        String token = value(request, "token");
        String password = request == null ? null : request.get("password");
        String confirmPassword = request == null ? null : request.get("confirmPassword");
        if (token == null || token.isBlank()) return bad("Reset token is required.");
        try { ValidationUtil.password(password); }
        catch (org.springframework.web.server.ResponseStatusException e) { return bad(e.getReason()); }
        if (!password.equals(confirmPassword)) return bad("Passwords do not match.");

        AuthToken authToken = tokens.findActive(hash(token), "RESET").orElse(null);
        if (authToken == null) return bad("This password reset link is invalid or has expired.");
        AppUser user = users.findById(authToken.userId).orElse(null);
        if (user == null) return bad("Account not found.");
        user.passwordHash = encoder.encode(password);
        user.emailVerified = true;
        users.save(user);
        authToken.used = true;
        tokens.save(authToken);
        return ResponseEntity.ok(Map.of("message", "Your password has been reset. You can now sign in."));
    }

    private ResponseEntity<Map<String, String>> bad(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message == null ? "Invalid request." : message));
    }

    private String value(Map<String, String> map, String key) {
        if (map == null) return null;
        String value = map.get(key);
        return value == null ? null : value.trim();
    }

    private String issueToken(Long userId, String type, int hours) {
        // Only the newest unused token for this user and purpose should remain valid.
        tokens.invalidateUnusedForUser(userId, type);
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        AuthToken token = new AuthToken();
        token.tokenHash = hash(raw);
        token.userId = userId;
        token.type = type;
        token.expiresAt = LocalDateTime.now().plusHours(hours);
        token.used = false;
        tokens.save(token);
        return raw;
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash token", e);
        }
    }
}
