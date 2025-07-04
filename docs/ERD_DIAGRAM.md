# Entity Relationship Diagram

## TC Delivery Server Database Schema

```mermaid
erDiagram
    USERS ||--o{ DELIVERIES : creates
    USERS ||--o{ USER_ROUTES : "assigned to"
    ROUTES ||--o{ USER_ROUTES : "contains"
    ROUTES ||--o{ DELIVERIES : "from route"
    ROUTES ||--o{ DELIVERIES : "to route"
    CUSTOMERS ||--o{ DELIVERIES : "sender"
    CUSTOMERS ||--o{ DELIVERIES : "receiver"

    USERS {
        ObjectId _id PK
        string username UK "unique, 3-50 chars"
        string password "hashed, min 6 chars"
        enum role "superadmin|admin|manager|user"
        datetime createdAt
        datetime updatedAt
    }

    ROUTES {
        ObjectId _id PK
        string code UK "unique, format: T1, T2, etc"
        string name "max 100 chars"
        datetime createdAt
        datetime updatedAt
    }

    USER_ROUTES {
        ObjectId _id PK
        ObjectId userId FK "ref: USERS"
        ObjectId routeId FK "ref: ROUTES"
        ObjectId assignedBy FK "ref: USERS, manager+"
        datetime createdAt
        datetime updatedAt
    }

    CUSTOMERS {
        ObjectId _id PK
        string name "max 100 chars"
        string phone "international format"
        datetime createdAt
        datetime updatedAt
    }

    DELIVERIES {
        ObjectId _id PK
        ObjectId sender FK "ref: CUSTOMERS"
        ObjectId receiver FK "ref: CUSTOMERS"
        ObjectId fromRoute FK "ref: ROUTES"
        ObjectId toRoute FK "ref: ROUTES"
        string name "item name"
        number cost "delivery cost, min 0"
        string homeDelivery "delivery address"
        number homeDeliveryCost "min 0"
        number itemValue "item value, min 0"
        number itemCost "item cost, min 0"
        number collectCost "collection cost, min 0"
        number collectForCustomer "min 0, default 0"
        number collectForCustomerCost "min 0"
        string collectForCustomerNote "optional"
        ObjectId createdByUser FK "ref: USERS"
        datetime createdAt
        datetime updatedAt
    }
```

## Quick Reference

### Relationships
- **1 User** → **Many Deliveries** (creates)
- **1 Customer** → **Many Deliveries** (as sender)
- **1 Customer** → **Many Deliveries** (as receiver)
- **1 Route** → **Many Deliveries** (as from route)
- **1 Route** → **Many Deliveries** (as to route)
- **Many Users** ↔ **Many Routes** (through USER_ROUTES junction table)
- **1 User** → **Many User-Route Assignments** (assigned by manager+)

### Key Constraints
- Users: `username` is unique
- Routes: `code` is unique (format: T1, T2, etc.)
- Customers: `(name + phone)` combination is unique
- User_Routes: `(userId + routeId)` combination is unique
- Deliveries: All foreign keys are required (sender, receiver, fromRoute, toRoute, createdByUser)

### Business Rules
- Only users with role `manager`, `admin`, or `superadmin` can assign routes to users
- Users with role `user` can only view routes they are assigned to
- Route assignments are tracked with `assignedBy` field for audit purposes

### Legend
- **PK**: Primary Key
- **FK**: Foreign Key
- **UK**: Unique Key