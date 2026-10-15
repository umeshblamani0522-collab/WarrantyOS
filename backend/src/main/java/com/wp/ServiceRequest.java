package com.wp;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(indexes = {
        @Index(name = "idx_request_serial", columnList = "serialNumber"),
        @Index(name = "idx_request_status", columnList = "status")
})
public class ServiceRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 60) public String serialNumber;
    @Column(nullable = false, length = 1000) public String issue;
    @Column(nullable = false, length = 30) public String status = "REGISTERED";
    @Column(length = 100) public String assignedTo;
    @Column(length = 30) public String eligibility;
    @Column(length = 30) public String path;
    @Column(length = 1000) public String reason;
    public boolean escalated;
    public LocalDateTime createdAt = LocalDateTime.now(), resolvedAt;
}
