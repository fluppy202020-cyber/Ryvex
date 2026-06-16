# Ryvex Esports Security Specification

## 1. Data Invariants
- **Identity Isolation**: A user's coin ledger, spin activity, notification box, and support tickets belong exclusively to them. Standard users can never view or modify records belonging to other users.
- **Atomic Wallet Updates**: All coin modifications are ledger-backed. Users can only update their `coins` field on their profile via specific designated actions (Claim Daily, Watch Ad, Spin Wheel, Join/Leave Tournament) matched precisely with transactional log entries.
- **Roster Lock Integrity**: Once a tournament is initialized as completed or live, standard users can no longer alter rosters (`participantIds`).
- **Immutable Audit Trails**: Timestamps such as `createdAt` and identity credentials like `uid`/`email` are read-only properties after document creation.

---

## 2. The "Dirty Dozen" Payloads
These payloads attempt to exploit access channels and must be rejected by Fire Store rules:

1. **User Shadow Update (Vulnerability Check)**:
   ```json
   { "uid": "user123", "username": "JohnDoe", "email": "user@example.com", "coins": 10, "isAdmin": true }
   ```
2. **User Identity Spoofing (Vulnerability Check)**:
   ```json
   { "uid": "attacker_uid", "email": "victim@example.com", "username": "Gamer" }
   ```
3. **User Balance Value Poisoning (Vulnerability Check)**:
   ```json
   { "coins": 999999.0, "updatedAt": "2026-06-15T12:00:00Z" }
   ```
4. **User Status Hijack / Self-Unban (Vulnerability Check)**:
   ```json
   { "banned": false, "updatedAt": "2026-06-15T12:00:00Z" }
   ```
5. **Tournament Reward Poisoning (Vulnerability Check)**:
   ```json
   { "status": "completed", "winnerId": "attacker_uid", "winnerName": "Attacker" }
   ```
6. **Tournament Slots Overwriting (Vulnerability Check)**:
   ```json
   { "participantIds": ["attacker_uid"], "participantNames": ["Attacker"], "title": "Hacked Tournament" }
   ```
7. **Coin Transaction Spoofing (Vulnerability Check)**:
   ```json
   { "transactionId": "tx_abc", "userId": "user123", "amount": 1000, "type": "admin_adjustment", "description": "Free Coins" }
   ```
8. **Spin Wheel Manipulation (Vulnerability Check)**:
   ```json
   { "spinId": "spin_abc", "userId": "user123", "rewardAmount": 50 }
   ```
9. **Notification Snooping (Vulnerability Check)**:
   Attempt to read: `notifications/another_user_notification_id` or query all notifications.
10. **Report Status Tampering (Vulnerability Check)**:
    ```json
    { "status": "resolved" }
    ```
11. **Announcement Publishing (Vulnerability Check)**:
    ```json
    { "id": "ann_xyz", "title": "Fake Holiday Event", "message": "Check details" }
    ```
12. **Id Poisoning Attack / Denial of Wallet (Vulnerability Check)**:
    Attempt to inject a 1MB long junk characters identifier for any document creation.

---

## 3. Security Assertions & Rules Mapping
- **Validation Blueprints (`isValidUser`, `isValidTournament`, etc.)** strictly pre-validate every element type, length, and structure.
- **`affectedKeys().hasOnly()`** partitions standard updates into safe, mutually exclusive single actions.
- **Verified email checks** block unauthenticated exploitation on standard writes.
- **Startup Connection Handshake** is explicitly allowed and secured using `/test-connection-doc-ryvex` path.
