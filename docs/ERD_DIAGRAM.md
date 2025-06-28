# Entity Relationship Diagram

## TC Delivery Server Database Schema

```mermaid
erDiagram
    USERS ||--o{ DELIVERIES : creates
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
        string route "delivery route"
        string name "item name"
        number cost "delivery cost, min 0"
        string homeDelivery "delivery address"
        number homeDeliveryCost "min 0"
        number itemValue "item value, min 0"
        number itemCost "item cost, min 0"
        number collectCost "collection cost, min 0"
        boolean collectForCustomer "default false"
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

### Key Constraints
- Users: `username` is unique
- Customers: `(name + phone)` combination is unique
- Deliveries: All foreign keys are required

### Legend
- **PK**: Primary Key
- **FK**: Foreign Key
- **UK**: Unique Key