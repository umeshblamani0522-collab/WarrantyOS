package com.wp;

import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class CustomerRepo extends JpaStore<Customer> {
    public CustomerRepo() { super(Customer.class); }

    public Optional<Customer> findByEmailIgnoreCase(String email) {
        return em.createQuery("select c from Customer c where lower(c.email) = lower(:email)", Customer.class)
                .setParameter("email", email)
                .getResultStream().findFirst();
    }
}
