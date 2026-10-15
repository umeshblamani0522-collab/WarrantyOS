package com.wp;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final WarrantyService s;
    private final CustomerRepo customers;
    private final ProductRepo products;
    private final PolicyRepo policies;
    private final WarrantyRepo warranties;
    private final RequestRepo requests;
    private final RepairRepo repairs;
    private final ReplacementRepo replacements;
    private final AuditRepo audits;
    private final UserRepo users;

    public ApiController(WarrantyService s, CustomerRepo customers, ProductRepo products, PolicyRepo policies,
                         WarrantyRepo warranties, RequestRepo requests, RepairRepo repairs,
                         ReplacementRepo replacements, AuditRepo audits, UserRepo users) {
        this.s=s; this.customers=customers; this.products=products; this.policies=policies; this.warranties=warranties;
        this.requests=requests; this.repairs=repairs; this.replacements=replacements; this.audits=audits; this.users=users;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "UP", "service", "WarrantyOS", "time", java.time.OffsetDateTime.now().toString());
    }

    @GetMapping("/customers") @PreAuthorize("hasRole('ADMIN')")
    List<Customer> customers(){ return customers.findAll(); }

    @PostMapping("/customers") @PreAuthorize("hasRole('ADMIN')")
    Customer addCustomer(@RequestBody(required = false) Customer c){
        if (c == null) throw ValidationUtil.bad("Customer details are required.");
        c.name = ValidationUtil.name(c.name);
        c.email = ValidationUtil.email(c.email);
        c.phone = ValidationUtil.optionalPhone(c.phone);
        if (customers.findByEmailIgnoreCase(c.email).isPresent()) throw ValidationUtil.bad("Customer email already exists.");
        if (users.findByEmailIgnoreCase(c.email).isPresent()) throw ValidationUtil.bad("A login account with this email already exists.");
        Customer x=customers.save(c); s.audit("CUSTOMER",x.id,"CREATED",x.name); return x;
    }

    @GetMapping("/products") @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    List<Product> products(Authentication auth){
        AppUser u=current(auth);
        return "CUSTOMER".equalsIgnoreCase(u.role) ? products.findByCustomerId(u.customerId) : products.findAll();
    }

    @PostMapping("/products") @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    Product addProduct(@RequestBody(required = false) Product p, Authentication auth){
        if (p == null) throw ValidationUtil.bad("Product details are required.");
        AppUser u = current(auth);
        if ("CUSTOMER".equalsIgnoreCase(u.role)) {
            if (u.customerId == null || !customers.existsById(u.customerId)) {
                throw ValidationUtil.bad("Your customer profile could not be found.");
            }
            // Never trust a customer-supplied customerId. Ownership always comes from the logged-in account.
            p.customerId = u.customerId;
        } else if (p.customerId == null) {
            throw ValidationUtil.bad("A customer must be selected for this product.");
        }
        return s.registerProduct(p);
    }

    @GetMapping("/policies") @PreAuthorize("hasRole('ADMIN')")
    List<Policy> policies(){ return policies.findAll(); }

    @PostMapping("/policies") @PreAuthorize("hasRole('ADMIN')")
    Policy addPolicy(@RequestBody(required = false) Policy p){
        if (p == null) throw ValidationUtil.bad("Policy details are required.");
        p.name = ValidationUtil.text(p.name, "Policy name", 2, 140);
        p.category = ValidationUtil.category(p.category);
        if (p.model != null && !p.model.isBlank()) p.model = ValidationUtil.text(p.model, "Policy model", 1, 120);
        if (p.durationMonths < 1 || p.durationMonths > 120) throw ValidationUtil.bad("Warranty duration must be between 1 and 120 months.");
        if (p.replaceAfterRepairs < 1 || p.replaceAfterRepairs > 20) throw ValidationUtil.bad("Replacement threshold must be between 1 and 20 repairs.");
        p.coverageConditions = normalizeOptional(p.coverageConditions, 2000);
        p.exclusions = normalizeOptional(p.exclusions, 2000);
        p.purchaseConditions = normalizeOptional(p.purchaseConditions, 1000);
        p.active = true;
        Policy x=policies.save(p); s.audit("POLICY",x.id,"SAVED",x.name); return x;
    }

    @GetMapping("/warranties") @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    List<Map<String,Object>> warranties(Authentication auth){
        AppUser u=current(auth);
        List<Warranty> ws = "CUSTOMER".equalsIgnoreCase(u.role)
                ? warranties.findAll().stream().filter(w -> products.findByCustomerId(u.customerId).stream().anyMatch(p -> p.serialNumber.equalsIgnoreCase(w.serialNumber))).toList()
                : warranties.findAll();
        return ws.stream().map(s::status).toList();
    }

    @PostMapping("/warranties/activate/{serial}") @PreAuthorize("hasRole('ADMIN')")
    Map<String,Object> activate(@PathVariable String serial){ return s.status(s.activateWarranty(serial)); }

    @GetMapping("/requests") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN','CUSTOMER')")
    List<ServiceRequest> requests(Authentication auth){
        AppUser u=current(auth);
        if("TECHNICIAN".equalsIgnoreCase(u.role)) return requests.findByAssignedToIgnoreCase(u.name);
        if("CUSTOMER".equalsIgnoreCase(u.role)) {
            Set<String> serials = new HashSet<>(products.findByCustomerId(u.customerId).stream().map(p -> p.serialNumber).toList());
            return requests.findAll().stream().filter(r -> serials.contains(r.serialNumber)).toList();
        }
        return requests.findAll();
    }

    @PostMapping("/requests/warranty-claim") @PreAuthorize("hasRole('CUSTOMER')")
    ServiceRequest claimWarranty(@RequestBody(required = false) ServiceRequest r, Authentication auth){
        AppUser u=current(auth);
        if (r == null) throw ValidationUtil.bad("Warranty claim details are required.");
        Product p=products.findBySerialNumber(r.serialNumber).orElseThrow(() -> ValidationUtil.bad("Product not found."));
        if (!Objects.equals(p.customerId, u.customerId)) throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Product does not belong to this customer");
        Warranty w=warranties.findBySerialNumber(p.serialNumber).orElseThrow(() -> ValidationUtil.bad("Warranty has not been activated for this product."));
        if (java.time.LocalDate.now().isAfter(w.expiryDate)) throw ValidationUtil.bad("Warranty expired on " + w.expiryDate + ".");
        return s.raise(r);
    }

    @PostMapping("/requests") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN','CUSTOMER')")
    ServiceRequest raise(@RequestBody(required = false) ServiceRequest r, Authentication auth){
        AppUser u=current(auth);
        if (r == null) throw ValidationUtil.bad("Service request details are required.");
        if("CUSTOMER".equalsIgnoreCase(u.role)) {
            Product p=products.findBySerialNumber(r.serialNumber).orElseThrow(() -> ValidationUtil.bad("Product not found."));
            if(!Objects.equals(p.customerId,u.customerId)) throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Product does not belong to this customer");
        }
        ServiceRequest created = s.raise(r);
        if ("TECHNICIAN".equalsIgnoreCase(u.role)) {
            created = s.assign(created.id, u.name);
        }
        return created;
    }

    @PutMapping("/requests/{id}/assign") @PreAuthorize("hasRole('ADMIN')")
    ServiceRequest assign(@PathVariable Long id,@RequestParam String tech){ return s.assign(id,tech); }

    @PutMapping("/requests/{id}/status") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    ServiceRequest status(@PathVariable Long id,@RequestParam String status, Authentication auth){
        AppUser u=current(auth);
        if("TECHNICIAN".equalsIgnoreCase(u.role)) {
            ServiceRequest r=requests.findById(id).orElseThrow(() -> ValidationUtil.bad("Request not found."));
            if(r.assignedTo==null || !r.assignedTo.equalsIgnoreCase(u.name)) throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Request is not assigned to this technician");
        }
        return s.changeStatus(id,status);
    }

    @PostMapping("/repairs") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    Repair repair(@RequestBody(required = false) Repair r, Authentication auth){
        if (r == null) throw ValidationUtil.bad("Repair details are required.");
        if("TECHNICIAN".equalsIgnoreCase(current(auth).role)) {
            ServiceRequest req=requests.findById(r.requestId).orElseThrow(() -> ValidationUtil.bad("Request not found."));
            if(req.assignedTo==null || !req.assignedTo.equalsIgnoreCase(current(auth).name)) throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Request is not assigned to this technician");
        }
        return s.repair(r);
    }

    @GetMapping("/repairs") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    List<Repair> repairs(Authentication auth){
        if("TECHNICIAN".equalsIgnoreCase(current(auth).role)) {
            Set<Long> ids=requests.findByAssignedToIgnoreCase(current(auth).name).stream().map(r->r.id).collect(java.util.stream.Collectors.toSet());
            return repairs.findAll().stream().filter(r -> ids.contains(r.requestId)).toList();
        }
        return repairs.findAll();
    }

    @PostMapping("/replacements") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    ReplacementRecord replace(@RequestBody(required = false) ReplacementRecord r, Authentication auth){
        if (r == null) throw ValidationUtil.bad("Replacement details are required.");
        if("TECHNICIAN".equalsIgnoreCase(current(auth).role)) {
            ServiceRequest req=requests.findById(r.requestId).orElseThrow(() -> ValidationUtil.bad("Request not found."));
            if(req.assignedTo==null || !req.assignedTo.equalsIgnoreCase(current(auth).name)) throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Request is not assigned to this technician");
        }
        return s.replace(r);
    }

    @GetMapping("/replacements") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    List<ReplacementRecord> replacements(Authentication auth){
        AppUser u = current(auth);
        if ("TECHNICIAN".equalsIgnoreCase(u.role)) {
            Set<Long> assignedRequestIds = requests.findByAssignedToIgnoreCase(u.name).stream()
                    .map(r -> r.id)
                    .collect(java.util.stream.Collectors.toSet());
            return replacements.findAll().stream()
                    .filter(r -> assignedRequestIds.contains(r.requestId))
                    .toList();
        }
        return replacements.findAll();
    }

    @GetMapping("/history/{serial}") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN','CUSTOMER')")
    Map<String,Object> history(@PathVariable String serial, Authentication auth){
        String normalized = ValidationUtil.serial(serial);
        AppUser u=current(auth);
        if("CUSTOMER".equalsIgnoreCase(u.role)) {
            Product p=products.findBySerialNumber(normalized).orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Product not found"));
            if(!Objects.equals(p.customerId,u.customerId)) throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Product does not belong to this customer");
        }
        Map<String,Object> m=new LinkedHashMap<>();
        List<ServiceRequest> rs=requests.findBySerialNumber(normalized);
        m.put("requests",rs);
        m.put("repairs",rs.stream().flatMap(r->repairs.findByRequestId(r.id).stream()).toList());
        m.put("replacements",replacements.findByOriginalSerial(normalized));
        return m;
    }

    @GetMapping("/analytics") @PreAuthorize("hasRole('ADMIN')") Map<String,Object> analytics(){ return s.analytics(); }
    @GetMapping("/audit") @PreAuthorize("hasRole('ADMIN')") List<Audit> audit(){ return audits.findAllByOrderByAtDesc(); }
    @GetMapping("/escalations") @PreAuthorize("hasRole('ADMIN')") List<ServiceRequest> esc(){ return requests.findAll().stream().filter(r->r.escalated).toList(); }
    @GetMapping("/users/technicians") @PreAuthorize("hasRole('ADMIN')")
    List<Map<String,Object>> technicians(){
        return users.findByRoleIgnoreCase("TECHNICIAN").stream().map(u -> {
            Map<String,Object> m = new LinkedHashMap<>(); m.put("id", u.id); m.put("name", u.name); m.put("email", u.email); return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    private AppUser current(Authentication auth){ return users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); }
    private String normalizeOptional(String value, int max) {
        if (value == null || value.isBlank()) return null;
        return ValidationUtil.text(value, "Policy text", 1, max);
    }
}
