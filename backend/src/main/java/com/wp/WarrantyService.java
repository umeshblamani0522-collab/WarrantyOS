package com.wp;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class WarrantyService {
    private final ProductRepo products;
    private final PolicyRepo policies;
    private final WarrantyRepo warranties;
    private final RequestRepo requests;
    private final RepairRepo repairs;
    private final ReplacementRepo replacements;
    private final AuditRepo audits;
    private final CustomerRepo customers;
    private final UserRepo users;
    private final NotificationService notifications;
    private final long slaHours;

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
            "REGISTERED", Set.of("ASSIGNED"),
            "ASSIGNED", Set.of("UNDER_REPAIR"),
            "UNDER_REPAIR", Set.of("RESOLVED"),
            "RESOLVED", Set.of("CLOSED"),
            "CLOSED", Set.of()
    );

    public WarrantyService(ProductRepo products, PolicyRepo policies, WarrantyRepo warranties,
                           RequestRepo requests, RepairRepo repairs, ReplacementRepo replacements,
                           AuditRepo audits, CustomerRepo customers, UserRepo users,
                           NotificationService notifications, @Value("${sla.hours:48}") long slaHours) {
        this.products = products;
        this.policies = policies;
        this.warranties = warranties;
        this.requests = requests;
        this.repairs = repairs;
        this.replacements = replacements;
        this.audits = audits;
        this.customers = customers;
        this.users = users;
        this.notifications = notifications;
        this.slaHours = Math.max(1, slaHours);
    }

    public void audit(String entity, Long id, String action, String detail) {
        Audit x = new Audit(); x.entity = entity; x.entityId = id; x.action = action; x.detail = detail;
        audits.save(x);
    }

    static ResponseStatusException bad(String message) { return ValidationUtil.bad(message); }

    public Product registerProduct(Product p) {
        if (p == null) throw bad("Product details are required.");
        p.serialNumber = ValidationUtil.serial(p.serialNumber);
        p.model = ValidationUtil.model(p.model);
        p.category = ValidationUtil.category(p.category);
        ValidationUtil.notFuture(p.purchaseDate, "Purchase date");
        if (p.customerId == null || !customers.existsById(p.customerId)) throw bad("A valid customer is required.");
        if (products.findBySerialNumber(p.serialNumber).isPresent()) throw bad("Product serial number already exists: " + p.serialNumber);

        Product saved = products.save(p);
        audit("PRODUCT", saved.id, "REGISTERED", saved.serialNumber);
        notifyCustomerForProduct(saved, "PRODUCT", "Product registered", "Product " + saved.serialNumber + " was registered successfully.");
        return saved;
    }

    public Warranty activateWarranty(String serial) {
        String normalized = ValidationUtil.serial(serial);
        Product p = products.findBySerialNumber(normalized).orElseThrow(() -> bad("Product is not registered."));
        ValidationUtil.notFuture(p.purchaseDate, "Purchase date");
        if (warranties.findBySerialNumber(normalized).isPresent()) throw bad("Warranty is already activated for this product.");

        Policy policy = policies.findAll().stream()
                .filter(x -> x.active)
                .filter(x -> x.category != null && x.category.equalsIgnoreCase(p.category))
                .filter(x -> x.model != null && !x.model.isBlank() && x.model.equalsIgnoreCase(p.model))
                .findFirst()
                .orElseGet(() -> policies.findAll().stream()
                        .filter(x -> x.active)
                        .filter(x -> x.category != null && x.category.equalsIgnoreCase(p.category))
                        .filter(x -> x.model == null || x.model.isBlank())
                        .findFirst()
                        .orElseThrow(() -> bad("No active warranty policy applies to this product model/category.")));

        if (policy.durationMonths < 1 || policy.durationMonths > 120) throw bad("The selected policy has an invalid duration.");

        Warranty w = new Warranty();
        w.serialNumber = normalized;
        w.policyId = policy.id;
        w.activationDate = p.purchaseDate;
        w.expiryDate = p.purchaseDate.plusMonths(policy.durationMonths);
        w = warranties.save(w);

        audit("WARRANTY", w.id, "ACTIVATED", normalized + " until " + w.expiryDate);
        notifyCustomerForSerial(normalized, "WARRANTY", "Warranty activated", "Warranty for " + normalized + " is active until " + w.expiryDate + ".");
        return w;
    }

    public Map<String, Object> status(Warranty w) {
        Map<String, Object> m = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        m.put("id", w.id);
        m.put("serialNumber", w.serialNumber);
        m.put("policyId", w.policyId);
        m.put("activationDate", w.activationDate);
        m.put("expiryDate", w.expiryDate);
        m.put("status", !today.isAfter(w.expiryDate) ? "ACTIVE" : "EXPIRED");
        return m;
    }

    /** Core business engine: determines warranty eligibility and the applicable service path. */
    public ServiceRequest validate(ServiceRequest r) {
        r.serialNumber = ValidationUtil.serial(r.serialNumber);
        r.issue = ValidationUtil.issue(r.issue);

        Optional<Product> product = products.findBySerialNumber(r.serialNumber);
        if (product.isEmpty()) {
            r.eligibility = "REJECTED";
            r.path = "NONE";
            r.reason = "Product not registered.";
            return r;
        }

        Optional<Warranty> warranty = warranties.findBySerialNumber(r.serialNumber);
        if (warranty.isEmpty()) {
            r.eligibility = "NOT_COVERED";
            r.path = "PAID_REPAIR";
            r.reason = "No warranty has been activated for this product.";
            return r;
        }

        Policy policy = policies.findById(warranty.get().policyId).orElse(null);
        if (policy == null || !policy.active) {
            r.eligibility = "NOT_COVERED";
            r.path = "PAID_REPAIR";
            r.reason = "The linked warranty policy is inactive or missing.";
            return r;
        }

        if (LocalDate.now().isAfter(warranty.get().expiryDate)) {
            r.eligibility = "NOT_COVERED";
            r.path = "PAID_REPAIR";
            r.reason = "Warranty expired on " + warranty.get().expiryDate + ".";
            return r;
        }

        String issueLower = r.issue.toLowerCase(Locale.ROOT);
        if (policy.exclusions != null && !policy.exclusions.isBlank()) {
            for (String raw : policy.exclusions.split(",")) {
                String excluded = raw.trim().toLowerCase(Locale.ROOT);
                if (!excluded.isEmpty() && issueLower.contains(excluded)) {
                    r.eligibility = "NOT_COVERED";
                    r.path = "PAID_REPAIR";
                    r.reason = "Excluded by policy: '" + excluded + "'.";
                    return r;
                }
            }
        }

        long previousCoveredRepairs = requests.findBySerialNumber(r.serialNumber).stream()
                .filter(x -> !Objects.equals(x.id, r.id))
                .filter(x -> "COVERED".equalsIgnoreCase(x.eligibility))
                .filter(x -> x.resolvedAt != null)
                .count();

        boolean previouslyReplaced = !replacements.findByOriginalSerial(r.serialNumber).isEmpty();
        r.eligibility = "COVERED";

        if (previouslyReplaced) {
            r.path = "REPAIR";
            r.reason = "Covered under " + policy.name + "; previous replacement history found, so the current unit is routed to repair assessment.";
        } else if (previousCoveredRepairs >= policy.replaceAfterRepairs) {
            r.path = "REPLACE";
            r.reason = "Covered under " + policy.name + "; " + previousCoveredRepairs + " prior repairs reached the replacement threshold of " + policy.replaceAfterRepairs + ".";
        } else {
            r.path = "REPAIR";
            r.reason = "Covered under " + policy.name + " (" + previousCoveredRepairs + " prior covered repairs).";
        }
        return r;
    }

    public ServiceRequest raise(ServiceRequest r) {
        if (r == null) throw bad("Service request details are required.");
        r.id = null;
        r.status = "REGISTERED";
        r.assignedTo = null;
        r.escalated = false;
        r.createdAt = LocalDateTime.now();
        r.resolvedAt = null;
        validate(r);

        Product product = products.findBySerialNumber(r.serialNumber).orElseThrow(() -> bad("Product is not registered."));
        r = requests.save(r);
        audit("REQUEST", r.id, "VALIDATED", r.eligibility + "/" + r.path + ": " + r.reason);
        notifications.sendToRole("ADMIN", "SERVICE_REQUEST", "New service request", "Request #" + r.id + " was created for " + r.serialNumber + ".");
        notifyCustomerForProduct(product, "SERVICE_REQUEST", "Service request created", "Your request #" + r.id + " has been registered and is now " + r.status + ".");
        return r;
    }

    public ServiceRequest assign(Long id, String tech) {
        ServiceRequest r = req(id);
        String technician = ValidationUtil.name(tech);
        AppUser user = users.findByNameIgnoreCaseAndRoleIgnoreCase(technician, "TECHNICIAN")
                .orElseThrow(() -> bad("Selected technician does not exist."));
        if ("CLOSED".equalsIgnoreCase(r.status) || "RESOLVED".equalsIgnoreCase(r.status)) throw bad("Closed or resolved requests cannot be assigned.");
        if (!Set.of("REGISTERED", "ASSIGNED").contains(r.status)) throw bad("A request can only be assigned before repair work starts.");

        r.assignedTo = user.name;
        r.status = "ASSIGNED";
        audit("REQUEST", id, "ASSIGNED", user.name);
        notifications.sendToUser(user.id, "ASSIGNMENT", "New job assigned", "Service request #" + id + " has been assigned to you.");
        notifyCustomerForSerial(r.serialNumber, "ASSIGNMENT", "Technician assigned", "A technician has been assigned to request #" + id + ".");
        return requests.save(r);
    }

    public ServiceRequest changeStatus(Long id, String requestedStatus) {
        ServiceRequest r = req(id);
        String next = requestedStatus == null ? "" : requestedStatus.trim().toUpperCase(Locale.ROOT);
        if ("RESOLVED".equals(next)) {
            throw bad("A request is resolved only when a repair or replacement is recorded.");
        }
        Set<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(r.status, Set.of());
        if (!allowed.contains(next)) throw bad("Invalid status transition " + r.status + " -> " + next + ".");
        if ("UNDER_REPAIR".equals(next) && (r.assignedTo == null || r.assignedTo.isBlank())) {
            throw bad("A technician must be assigned before repair work starts.");
        }
        if ("CLOSED".equals(next) && !"RESOLVED".equals(r.status)) {
            throw bad("A request must be resolved before it can be closed.");
        }

        audit("REQUEST", id, "STATUS", r.status + " -> " + next);
        r.status = next;
        if ("CLOSED".equals(next)) r.resolvedAt = r.resolvedAt == null ? LocalDateTime.now() : r.resolvedAt;

        if ("UNDER_REPAIR".equals(next)) {
            notifyCustomerForSerial(r.serialNumber, "STATUS", "Service work started", "A technician has started work on request #" + id + ".");
        } else if ("CLOSED".equals(next)) {
            notifyCustomerForSerial(r.serialNumber, "STATUS", "Service request closed", "Request #" + id + " has been closed after successful resolution.");
        }
        return requests.save(r);
    }

    private ServiceRequest completeRequest(ServiceRequest r, String type, String title, String message) {
        audit("REQUEST", r.id, "STATUS", r.status + " -> RESOLVED");
        r.status = "RESOLVED";
        r.resolvedAt = LocalDateTime.now();
        notifyCustomerForSerial(r.serialNumber, type, title, message);
        return requests.save(r);
    }

    public Repair repair(Repair rp) {
        if (rp == null || rp.requestId == null) throw bad("A valid service request is required for repair work.");
        ServiceRequest r = req(rp.requestId);
        if (!"UNDER_REPAIR".equals(r.status)) throw bad("Repair work can only be recorded while the request is UNDER_REPAIR.");
        rp.diagnosis = ValidationUtil.text(rp.diagnosis, "Diagnosis", 3, 1500);
        rp.action = ValidationUtil.text(rp.action, "Repair action", 3, 2000);
        if (rp.parts != null) rp.parts = rp.parts.trim();
        if (!Double.isFinite(rp.laborCost) || rp.laborCost < 0 || rp.laborCost > 1_000_000) throw bad("Labour cost must be between 0 and 1,000,000.");
        rp.completedAt = LocalDateTime.now();
        rp = repairs.save(rp);
        audit("REPAIR", rp.id, "RECORDED", "Request #" + r.id + ": " + rp.action);
        completeRequest(r, "REPAIR", "Warranty service completed", "Repair work for request #" + r.id + " has been completed and the service request is now resolved.");
        return rp;
    }

    public ReplacementRecord replace(ReplacementRecord x) {
        if (x == null || x.requestId == null) throw bad("A valid service request is required for replacement.");
        ServiceRequest r = req(x.requestId);
        if (!"REPLACE".equalsIgnoreCase(r.path) || !"COVERED".equalsIgnoreCase(r.eligibility)) throw bad("This request is not eligible for replacement.");
        if (!"UNDER_REPAIR".equals(r.status)) throw bad("Replacement can only be recorded while the request is UNDER_REPAIR.");

        String original = ValidationUtil.serial(r.serialNumber);
        String replacementSerial = ValidationUtil.serial(x.replacementSerial);
        if (original.equalsIgnoreCase(replacementSerial)) throw bad("Replacement serial must be different from the original serial.");
        Product originalProduct = products.findBySerialNumber(original).orElseThrow(() -> bad("Original product is not registered."));
        Product replacementProduct = products.findBySerialNumber(replacementSerial).orElseThrow(() -> bad("Replacement serial must be a registered product."));
        if (!Objects.equals(originalProduct.customerId, replacementProduct.customerId)) throw bad("Replacement product must belong to the same customer.");
        x.originalSerial = original;
        x.replacementSerial = replacementSerial;
        x.reason = ValidationUtil.text(x.reason, "Replacement reason", 5, 1000);
        x.replacedOn = LocalDate.now();
        x = replacements.save(x);
        audit("REPLACEMENT", x.id, "CREATED", x.originalSerial + " -> " + x.replacementSerial);
        completeRequest(r, "REPLACEMENT", "Warranty replacement completed", "The replacement for request #" + r.id + " has been recorded and the service request is now resolved.");
        return x;
    }

    ServiceRequest req(Long id) { return requests.findById(id).orElseThrow(() -> bad("Request not found.")); }

    @Scheduled(fixedRate = 60_000)
    public void escalate() {
        LocalDateTime now = LocalDateTime.now();
        for (ServiceRequest r : requests.findAll()) {
            if (r.escalated || "RESOLVED".equals(r.status) || "CLOSED".equals(r.status)) continue;
            if (r.createdAt != null && ChronoUnit.HOURS.between(r.createdAt, now) >= slaHours) {
                r.escalated = true;
                requests.save(r);
                audit("REQUEST", r.id, "ESCALATED", "SLA of " + slaHours + "h exceeded; routed to administrator supervision.");
                notifications.sendToRole("ADMIN", "ESCALATION", "SLA escalation", "Request #" + r.id + " exceeded the " + slaHours + "h SLA.");
                notifyCustomerForSerial(r.serialNumber, "ESCALATION", "Service delay alert", "Request #" + r.id + " has exceeded the expected service timeline.");
            }
        }
    }

    private void notifyCustomerForSerial(String serial, String type, String title, String message) {
        products.findBySerialNumber(serial).ifPresent(thisProduct -> notifyCustomerForProduct(thisProduct, type, title, message));
    }

    private void notifyCustomerForProduct(Product product, String type, String title, String message) {
        if (product.customerId == null) return;
        users.findAll().stream()
                .filter(u -> "CUSTOMER".equalsIgnoreCase(u.role) && Objects.equals(u.customerId, product.customerId))
                .findFirst()
                .ifPresent(u -> notifications.sendToUser(u.id, type, title, message));
    }

    public Map<String, Object> analytics() {
        List<ServiceRequest> all = requests.findAll();
        Map<String, Object> m = new LinkedHashMap<>();
        Map<String, String> modelOf = products.findAll().stream()
                .collect(Collectors.toMap(p -> p.serialNumber, p -> p.model, (a, b) -> a));
        double averageMinutes = all.stream()
                .filter(x -> x.resolvedAt != null && x.createdAt != null)
                .mapToLong(x -> ChronoUnit.MINUTES.between(x.createdAt, x.resolvedAt))
                .average().orElse(0);

        m.put("totalRequests", all.size());
        m.put("byStatus", all.stream().collect(Collectors.groupingBy(x -> x.status, Collectors.counting())));
        m.put("byEligibility", all.stream().filter(x -> x.eligibility != null).collect(Collectors.groupingBy(x -> x.eligibility, Collectors.counting())));
        m.put("escalated", all.stream().filter(x -> x.escalated).count());
        m.put("replacementRatePct", all.isEmpty() ? 0 : Math.round(replacements.count() * 1000.0 / all.size()) / 10.0);
        m.put("avgTurnaroundHours", Math.round((averageMinutes / 60.0) * 10.0) / 10.0);

        Map<String, Long> byModel = all.stream().collect(Collectors.groupingBy(x -> modelOf.getOrDefault(x.serialNumber, "Unknown"), Collectors.counting()));
        m.put("requestsByModel", byModel);
        m.put("recurringIssueModels", byModel.entrySet().stream()
                .filter(e -> e.getValue() >= 3)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));
        return m;
    }
}
