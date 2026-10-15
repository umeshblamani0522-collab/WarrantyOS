package com.wp;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public class AuthTokenRepo extends JpaStore<AuthToken> {
    public AuthTokenRepo() { super(AuthToken.class); }

    public Optional<AuthToken> findActive(String tokenHash, String type) {
        return em.createQuery("select t from AuthToken t where t.tokenHash = :tokenHash and t.type = :type and t.used = false and t.expiresAt > :now", AuthToken.class)
                .setParameter("tokenHash", tokenHash)
                .setParameter("type", type)
                .setParameter("now", LocalDateTime.now())
                .getResultStream().findFirst();
    }

    public long countActiveForUser(Long userId, String type) {
        return em.createQuery("select count(t) from AuthToken t where t.userId = :userId and t.type = :type and t.used = false and t.expiresAt > :now", Long.class)
                .setParameter("userId", userId)
                .setParameter("type", type)
                .setParameter("now", LocalDateTime.now())
                .getSingleResult();
    }

    /** Mark previous unused tokens of this type as unusable before issuing a new link. */
    @Transactional
    public int invalidateUnusedForUser(Long userId, String type) {
        return em.createQuery("update AuthToken t set t.used = true where t.userId = :userId and t.type = :type and t.used = false")
                .setParameter("userId", userId)
                .setParameter("type", type)
                .executeUpdate();
    }
}
