package com.wp;

import jakarta.persistence.*;

@Entity
@Table(uniqueConstraints = {
        @UniqueConstraint(name = "uk_customer_email", columnNames = "email")
})
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 100) public String name;
    @Column(nullable = false, length = 254) public String email;
    @Column(length = 30) public String phone;
}
