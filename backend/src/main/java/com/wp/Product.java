package com.wp;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(uniqueConstraints = {
        @UniqueConstraint(name = "uk_product_serial", columnNames = "serialNumber")
})
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 60) public String serialNumber;
    @Column(nullable = false, length = 120) public String model;
    @Column(nullable = false, length = 80) public String category;
    @Column(nullable = false) public LocalDate purchaseDate;
    @Column(nullable = false) public Long customerId;
}
