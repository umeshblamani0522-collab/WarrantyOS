package com.wp;

import jakarta.persistence.*;

@Entity
@Table
public class Policy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 140) public String name;
    @Column(nullable = false, length = 80) public String category;
    @Column(length = 120) public String model;
    @Column(nullable = false) public int durationMonths;
    @Column(length = 2000) public String coverageConditions;
    @Column(length = 2000) public String exclusions;
    @Column(length = 1000) public String purchaseConditions;
    @Column(nullable = false) public int replaceAfterRepairs = 3;
    @Column(nullable = false) public boolean active = true;
}
