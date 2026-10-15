package com.wp;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ReplacementRepo extends JpaStore<ReplacementRecord> {
    public ReplacementRepo() { super(ReplacementRecord.class); }

    public List<ReplacementRecord> findByOriginalSerial(String originalSerial) {
        return em.createQuery("select r from ReplacementRecord r where lower(r.originalSerial) = lower(:serial) order by r.id desc", ReplacementRecord.class)
                .setParameter("serial", originalSerial)
                .getResultList();
    }
}
