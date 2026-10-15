package com.wp;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table
public class Repair {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false) public Long requestId;
    @Column(length = 1500) public String diagnosis;
    @Column(length = 2000) public String action;
    @Column(length = 1000) public String parts;
    @Column(nullable = false) public double laborCost;
    public LocalDateTime completedAt = LocalDateTime.now();
}
