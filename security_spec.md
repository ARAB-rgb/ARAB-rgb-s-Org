# Security Specification & Test Cases

## 1. Data Invariants
- **Authentication**: All read and write operations require the client to be signed in (using Firebase Anonymous Auth or custom profiles).
- **Users**: Admin profile changes are restricted. Self-creation of admin accounts is blocked.
- **Installments**: Primary amounts must be greater than zero. Sequence IDs (`no` like `AW-INST-xxxx`) must be formatted correctly.
- **Receipts**: Amount must be greater than 0. Remaining before must equal remaining after plus paid amount.
- **Payments & Expenses**: Operational amount must be strictly positive (> 0).

## 2. The "Dirty Dozen" Vulnerability Payloads

### Payload 1: Administrator Escalation (Self-Admin Role Swap)
Attempting to create or update a user profile setting their role to `"admin"` when creating an account from an unprivileged client.
```json
{
  "id": "malicious_user",
  "name": "Hacker",
  "code": "hack99",
  "password": "123",
  "role": "admin",
  "perms": { "users": true, "payments": true }
}
```

### Payload 2: Installment Poisoning (Negative Amount)
Attempting to insert a contract installment with a negative total amount.
```json
{
  "id": "inst_1",
  "client": "Client A",
  "phone": "0500000000",
  "no": "AW-INST-0001",
  "amount": -5000,
  "paid": 0,
  "remaining": -5000
}
```

### Payload 3: Orphaned Receipts (Missing Linked Installment ID)
Inserting a receipt claiming to pay an installment that doesn't exist, or omitting IDs.
```json
{
  "id": "rec_1",
  "no": "AW-REC-0001",
  "from_name": "Ghost",
  "amount": 200,
  "method": "مدى",
  "date": "2026-06-15",
  "installment_id": ""
}
```

### Payload 4: Negative Vouchers (Expense/Payment Looting)
Issuing a negative amount payment.
```json
{
  "id": "pay_1",
  "no": "AW-PAY-0001",
  "to_name": "Supplier B",
  "amount": -1000,
  "method": "نقدي",
  "date": "2026-06-15"
}
```

### Payload 5: Date Manipulation (Backdated Record creation)
Injecting a document with an invalid future or fake timestamp to manipulate sequential audit.
```json
{
  "id": "session_1",
  "name": "Admin",
  "code": "admin_code",
  "role": "admin",
  "time": "year_2099_hacked",
  "action": "Spoofed entry"
}
```

### Payload 6: Worker Balance Overwrite
Updating worker advance directly to bypass cash drawer logging.
```json
{
  "id": "worker_1",
  "advance": 999999,
  "balance": 0
}
```

### Payload 7: Code Hijacking (Duplicate User Code)
Inserting a user profile that duplicates an existing code to intercept logins.
```json
{
  "id": "imposter",
  "name": "Imposer Employee",
  "code": "admin",
  "password": "hacked_password",
  "role": "employee"
}
```

### Payload 8: Free Quote Discount Abuse
Inserting quotes with an amount of negative tax or massive negative base amount.
```json
{
  "id": "quote_1",
  "no": "AW-Q-0001",
  "client": "Malicious",
  "amount": -100000
}
```

### Payload 9: Unauthorized Log Purging (Session Deletion)
Attempting to delete audit sessions to hide unauthorized ledger edits.
```json
{
  "id": "session_to_delete"
}
```

### Payload 10: Null / Blank Project IDs
Creating a project card with empty name coordinates.
```json
{
  "id": "proj_1",
  "name": "",
  "status": "نشط"
}
```

### Payload 11: Invalid ID injection
Creating document paths with system characters designed to break path resolution (e.g., `../admin`).
```json
{
  "id": "injected/path/traversal",
  "name": "Hacker"
}
```

### Payload 12: Terminal Installment Overwrites
Replacing an invoice record that has "مكتمل" (completed) status to mark it as uncompleted to steal funds.
```json
{
  "id": "inst_completed_1",
  "status": "منتظم"
}
```

---

## 3. The Test Runner Template (`firestore.rules.test.ts`)
```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

describe("ERP Firestore Security Rules", () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "trans-passkey-dbndl",
      firestore: {
        host: "localhost",
        port: 8080,
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("should deny unauthenticated users access to any collection", async () => {
    const context = testEnv.unauthenticatedContext();
    const db = context.firestore();
    await assertFails(db.collection("users").get());
    await assertFails(db.collection("installments").get());
  });

  it("should approve actions for authenticated app clients", async () => {
    const context = testEnv.authenticatedContext({ uid: "app_client" });
    const db = context.firestore();
    // Deny invalid payload on creation
    await assertFails(db.collection("installments").add({ amount: -500 }));
  });
});
```
