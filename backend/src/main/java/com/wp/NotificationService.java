package com.wp;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {
    private final NotificationRepo notifications;
    private final UserRepo users;
    private final SimpMessagingTemplate messaging;

    public NotificationService(NotificationRepo notifications, UserRepo users, SimpMessagingTemplate messaging) {
        this.notifications = notifications;
        this.users = users;
        this.messaging = messaging;
    }

    public Notification sendToUser(Long userId, String type, String title, String message) {
        Notification n = save(userId, null, type, title, message);
        messaging.convertAndSend("/topic/notifications/user/" + userId, n);
        return n;
    }

    /**
     * Create one notification per user in the role so read/unread state is
     * personal to each recipient. A single shared role notification would
     * make one customer's "read" action mark it read for every customer.
     */
    public void sendToRole(String role, String type, String title, String message) {
        users.findByRoleIgnoreCase(role).forEach(user -> sendToUser(user.id, type, title, message));
    }

    public List<Notification> forUser(AppUser user) {
        return notifications.findTop50ByRecipientUserIdOrTargetRoleOrderByCreatedAtDesc(user.id, user.role);
    }

    public boolean markReadForUser(Long id, AppUser user) {
        Notification n = notifications.findById(id).orElse(null);
        if (n == null) return false;
        boolean allowed = (n.recipientUserId != null && n.recipientUserId.equals(user.id))
                || (n.targetRole != null && n.targetRole.equalsIgnoreCase(user.role));
        if (!allowed) return false;
        if (!n.readFlag) {
            n.readFlag = true;
            notifications.save(n);
        }
        return true;
    }

    private Notification save(Long userId, String role, String type, String title, String message) {
        Notification n = new Notification();
        n.recipientUserId = userId;
        n.targetRole = role;
        n.type = type;
        n.title = title;
        n.message = message;
        return notifications.save(n);
    }
}
