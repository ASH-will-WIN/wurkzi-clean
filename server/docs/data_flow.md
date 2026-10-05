# Data Flow and Control Flow
The application uses a RESTful API to handle requests and responses.

## Data Flow
The data flow of the application is as follows:

* The client sends a request to the server using HTTP methods (GET, POST, PUT, DELETE)
* The server receives the request and processes it using the corresponding controller
* The controller interacts with the database using the Prisma client
* The database returns the data to the controller
* The controller returns the data to the client

## Control Flow
The control flow of the application is as follows:

* The client sends a request to the server
* The server receives the request and checks for authentication and authorization
* If the request is authenticated and authorized, the server processes the request using the corresponding controller
* The controller interacts with the database using the Prisma client
* The database returns the data to the controller
* The controller returns the data to the client