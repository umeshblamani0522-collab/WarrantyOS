package com.wp;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;

public final class ValidationUtil {
    private static final Pattern NAME = Pattern.compile("^[\\p{L}][\\p{L} .'-]{1,99}$");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE = Pattern.compile("^(?:\\+91[ -]?)?[6-9]\\d{9}$|^[0-9()+\\- ]{7,20}$");
    private static final Pattern SERIAL = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._/-]{1,59}$");
    private static final Pattern UPPER = Pattern.compile(".*[A-Z].*");
    private static final Pattern LOWER = Pattern.compile(".*[a-z].*");
    private static final Pattern DIGIT = Pattern.compile(".*\\d.*");
    private static final Pattern SPECIAL = Pattern.compile(".*[^A-Za-z0-9].*");

    private ValidationUtil() {}

    public static String text(String value, String field, int min, int max) {
        String v = value == null ? "" : value.trim();
        if (v.length() < min) throw bad(field + " must be at least " + min + " characters.");
        if (v.length() > max) throw bad(field + " must be at most " + max + " characters.");
        return v;
    }

    public static String name(String value) {
        String v = text(value, "Full name", 2, 100);
        if (!NAME.matcher(v).matches()) throw bad("Full name may contain letters, spaces, hyphens and apostrophes only.");
        return v.replaceAll("\\s+", " ");
    }

    public static String email(String value) {
        String v = text(value, "Email address", 5, 254).toLowerCase(Locale.ROOT);
        if (!EMAIL.matcher(v).matches()) throw bad("Please enter a valid email address.");
        return v;
    }

    public static String optionalPhone(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        String v = value.trim().replaceAll("\\s+", " ");
        if (!PHONE.matcher(v).matches()) throw bad("Please enter a valid phone number.");
        String digits = v.replaceAll("\\D", "");
        if (digits.length() == 10 && digits.charAt(0) >= '6' && digits.charAt(0) <= '9') return "+91 " + digits;
        if (digits.length() == 12 && digits.startsWith("91") && digits.charAt(2) >= '6' && digits.charAt(2) <= '9') return "+91 " + digits.substring(2);
        return v;
    }

    public static String password(String value) {
        if (value == null) throw bad("Password is required.");
        if (value.length() < 8 || value.length() > 64) throw bad("Password must be 8 to 64 characters long.");
        if (!UPPER.matcher(value).matches() || !LOWER.matcher(value).matches() || !DIGIT.matcher(value).matches() || !SPECIAL.matcher(value).matches()) {
            throw bad("Password must contain at least one uppercase letter, one lowercase letter, one number and one special character.");
        }
        return value;
    }

    public static String serial(String value) {
        String v = text(value, "Serial number", 2, 60).toUpperCase(Locale.ROOT);
        if (!SERIAL.matcher(v).matches()) throw bad("Serial number contains unsupported characters.");
        return v;
    }

    public static String issue(String value) {
        return text(value, "Issue description", 5, 1000);
    }

    public static String model(String value) {
        return text(value, "Product model", 1, 120);
    }

    public static String category(String value) {
        return text(value, "Product category", 1, 80);
    }

    public static void notFuture(LocalDate value, String field) {
        if (value == null) throw bad(field + " is required.");
        if (value.isAfter(LocalDate.now())) throw bad(field + " cannot be in the future.");
    }

    public static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
