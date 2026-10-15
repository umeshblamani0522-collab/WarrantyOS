package com.wp;

import org.springframework.beans.factory.annotation.Value;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class MailService {
    private final String mode;
    private final String baseUrl;
    private final String host;
    private final int port;
    private final String username;
    private final String password;
    private final String from;
    private final String fromName;
    private final boolean startTls;
    private final boolean auth;
    private final JavaMailSender mailSender;

    public MailService(
            @Value("${app.mail-mode:smtp}") String mode,
            @Value("${app.base-url:http://localhost:5173}") String baseUrl,
            @Value("${app.mail.host:}") String host,
            @Value("${app.mail.port:587}") int port,
            @Value("${app.mail.username:}") String username,
            @Value("${app.mail.password:}") String password,
            @Value("${app.mail.from:}") String from,
            @Value("${app.mail.from-name:WarrantyOS}") String fromName,
            @Value("${app.mail.starttls:true}") boolean startTls,
            @Value("${app.mail.auth:true}") boolean auth) {
        this.mode = mode == null ? "smtp" : mode.trim();
        this.baseUrl = baseUrl == null ? "http://localhost:5173" : baseUrl.trim();
        this.host = host == null ? "" : host.trim();
        this.port = port;
        this.username = username == null ? "" : username.trim();
        this.password = password == null ? "" : password;
        this.from = from == null ? "" : from.trim();
        this.fromName = fromName == null ? "WarrantyOS" : fromName.trim();
        this.startTls = startTls;
        this.auth = auth;
        this.mailSender = createSender();
    }

    public String verificationUrl(String token) {
        return baseUrl + "/verify-email?token=" + token;
    }

    public String resetUrl(String token) {
        return baseUrl + "/reset-password?token=" + token;
    }

    public boolean isSmtpMode() {
        return "smtp".equalsIgnoreCase(mode);
    }

    public void sendVerification(String email, String name, String token) {
        String url = verificationUrl(token);
        String subject = "Verify your WarrantyOS account";
        String text = "Hello " + name + ",\n\n"
                + "Thank you for creating your WarrantyOS customer account.\n\n"
                + "Please verify your email address by opening this link:\n"
                + url + "\n\n"
                + "This verification link expires in 24 hours.\n\n"
                + "Regards,\nWarrantyOS";
        send(email, subject, text, url, "verification", name);
    }

    public void sendPasswordReset(String email, String name, String token) {
        String url = resetUrl(token);
        String subject = "Reset your WarrantyOS password";
        String text = "Hello " + name + ",\n\n"
                + "We received a request to reset your WarrantyOS password.\n\n"
                + "Open this link to choose a new password:\n"
                + url + "\n\n"
                + "This link expires in 1 hour and can only be used once.\n\n"
                + "Regards,\nWarrantyOS";
        send(email, subject, text, url, "password reset", name);
    }

    private void send(String email, String subject, String text, String url, String kind, String name) {
        if (!isSmtpMode()) {
            System.out.println("[WarrantyOS] " + kind + " email for " + email + " (" + name + "): " + url);
            return;
        }
        if (host.isBlank() || username.isBlank() || password.isBlank() || (from.isBlank() && username.isBlank())) {
            throw new IllegalStateException("SMTP mail mode is enabled but MAIL_HOST, MAIL_USERNAME and MAIL_PASSWORD are not configured.");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, java.nio.charset.StandardCharsets.UTF_8.name());
            helper.setTo(email);
            // The sender must be a mailbox authorized by the configured SMTP account.
            helper.setFrom(from.isBlank() ? username : from, fromName.isBlank() ? "WarrantyOS" : fromName);
            helper.setSubject(subject);
            helper.setText(text, false);
            mailSender.send(message);
        } catch (Exception ex) {
            throw new IllegalStateException("WarrantyOS could not send email. Check the SMTP host, port, sender mailbox, app password and provider settings in backend\\mail.env.cmd.", ex);
        }
    }

    private JavaMailSender createSender() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        if (!host.isBlank()) sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);
        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", Boolean.toString(auth));
        props.put("mail.smtp.starttls.enable", Boolean.toString(startTls));
        if (startTls) props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
        return sender;
    }
}
