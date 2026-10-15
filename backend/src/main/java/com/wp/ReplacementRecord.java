package com.wp;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity(name = "ReplacementRecord")
@Table(name = "replacement")
public class ReplacementRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false) public Long requestId;
    @Column(nullable = false, length = 60) public String originalSerial;
    @Column(nullable = false, length = 60) public String replacementSerial;
    @Column(length = 1000) public String reason;
    @Column(nullable = false) public LocalDate replacedOn = LocalDate.now();
}
