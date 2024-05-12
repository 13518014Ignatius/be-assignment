## Description

This application is a backend service that handles transactions between accounts.

The application uses NodeJS as the programming language and Fastify as the framework for the API routes.
It uses PostgreSQL as the database and Prisma as the database ORM.
it uses JSON Web Token as the authentication system of the API routes. 
The application is containerized using Docker.

The application's database has 4 tables:
1. User: The owner of the accounts. The information is also used to log in so the API routes can be accessed.
2. Account: The accounts that each user has. Many-to-One relationship with User table
3. Balance: To handle different currencies of an account's balance. Many-to-One relationship with Accounts table.
4. Transaction: The transactions that happen in the service is recorded here.

The application has 5 API endpoints:
1. /accounts/[userId] - GET
This API route is used to retrieve all accounts of a user. The route can only be accessed when the user is logged in and can only retrieve accounts of the logged in user.

2. /transactions/[userId] - GET
This API route is used to retrieve all transactions of all accounts of a user. This includes sent and received transactions. The route can only be accessed when the user is logged in and can only retrieve transactions of all accounts of the logged in user.

3. /send - POST
Request Body:
- amount: Float, the number of money being sent
- currency: String, the currency of the money
- senderId: Int, the ID of the sender's account
- receiverId: Int, the ID of the receiver's account
This API route is used to send money to another account. The route can only be accessed when the user is logged in and can only send money from an account of the logged in user.

4. /withdraw - POST
Request Body:
- amount: Float, the number of money being sent
- currency: String, the currency of the money
- accountId: Int, the ID of the withdraw account
This API route is used to withdraw money from an account. The route can only be accessed when the user is logged in and can only withdraw money from an account of the logged in user.

5. /login - POST
Request Body:
- username: String, the username of the user
- password: String, the password of the user
This API route is used to log a user in. It returns access token that is required to access the other API routes in this application.

## Prerequisites
1. Node (NPM)
2. PostgreSQL

## How to install and run

1. Clone the repository
2. Run "npm install" to install all required dependencies
3. Create a PostgreSQL database for this app
4. Connect the database to this app by modifying DATABASE_URL value in the .env file
5. Run "npx prisma migrate dev --name [DATABASE_NAME]" to migrate the schema to the database
6. Seed the database by modifying the seed.js file in prisma directory
7. Run "docker build -t [DOCKER_IMAGE_NAME] ." and "docker run -it -p [PORT] [DOCKER_IMAGE_NAME]" to build the Docker image and run it, respectively.
8. The application is now running and the API routes should be able to be accessed.


