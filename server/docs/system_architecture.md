graph LR
    participant Client as "Client"
    participant Server as "Server"
    participant Database as "Database"

    Client->>Server: Request
    Server->>Database: Query
    Database->>Server: Response
    Server->>Client: Response