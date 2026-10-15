package com.wp;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(uniqueConstraints = {
        @UniqueConstraint(name = "uk_warranty_serial", columnNames = "serialNumber")
})
public class Warranty {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 60) public String serialNumber;
    @Column(nullable = false) public Long policyId;
    @Column(nullable = false) public LocalDate activationDate;
    @Column(nullable = false) public LocalDate expiryDate;
}
