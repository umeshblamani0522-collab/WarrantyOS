package com.wp;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auth_tokens", indexes = {
        @Index(name = "idx_auth_tokens_hash", columnList = "tokenHash"),
        @Index(name = "idx_auth_tokens_user_type", columnList = "userId,type")
})
public class AuthToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, unique = true, length = 128)
    public String tokenHash;

    @Column(nullable = false)
    public Long userId;

    @Column(nullable = false, length = 20)
    public String type;

    @Column(nullable = false)
    public LocalDateTime expiresAt;

    @Column(nullable = false)
    public boolean used = false;

    @Column(nullable = false)
    public LocalDateTime createdAt = LocalDateTime.now();
}
