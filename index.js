const fastify = require('fastify')({ logger: true })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const util = require('util');
const fastifySwagger = require('@fastify/swagger');
const fastifySwaggerUi = require('@fastify/swagger-ui');

const swaggerOptions = {
  swagger: {
    info: {
      title: "My Title",
      description: "My Description.",
      version: "1.0.0",
    },
    host: "localhost",
    schemes: ["http", "https"],
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [{ name: "Default", description: "Default" }],
  },
};

const swaggerUiOptions = {
  routePrefix: "/docs",
  exposeRoute: true,
};

fastify.register(fastifySwagger, swaggerOptions);
fastify.register(fastifySwaggerUi, swaggerUiOptions);

const SECRET_KEY = 'thisisasecretkey' // replace with your own secret key

fastify.register((fastify, options, done) => {
  // Declare a login route
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    // replace with your own authentication logic
    const user = await prisma.user.findUnique({ where: { username } })
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, SECRET_KEY)
      reply.send({ status: "Login successful", token: token })
    } else {
      reply.code(401).send({ error: 'Invalid username or password' })
    }
  })

  // Declare a route
  fastify.get('/', async (request, reply) => {
    const authHeader = request.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return reply.code(401).send()
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) return reply.code(403).send()
      request.user = user
      reply.send({ hello: 'world' })
    })
  })


  // Get all accounts of a user
  fastify.get('/accounts/:userId', async (request, reply) => {
    const { userId } = request.params;
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return reply.code(401).send();

    const jwtVerify = util.promisify(jwt.verify);
    try {
      const user = await jwtVerify(token, SECRET_KEY);
      if (Number(userId) !== user.id) {
        return reply.code(403).send({ error: 'You are not authorized to access this route' });
      }
      const accounts = await prisma.account.findMany({
        where: {
          userId: Number(userId),
        },
        include: {
          balances: true,
        },
      });
      return reply.send(accounts);
    } catch (err) {
      return reply.code(403).send();
    }
  });

  // Get all transactions of a user
  fastify.get('/transactions/:userId', async (request, reply) => {
    const { userId } = request.params;
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return reply.code(401).send();

    const jwtVerify = util.promisify(jwt.verify);
    try {
      const user = await jwtVerify(token, SECRET_KEY);
      if (Number(userId) !== user.id) {
        return reply.code(403).send({ error: 'You are not authorized to access this route' });
      }
      const userAccounts = await prisma.account.findMany({
        where: {
          userId: Number(userId),
        },
      });
      const transactions = await Promise.all(userAccounts.map(async (account) => {
        const sentTransactions = await prisma.transaction.findMany({
          where: {
            senderId: account.id,
          },
        });
        const receivedTransactions = await prisma.transaction.findMany({
          where: {
            receiverId: account.id,
          },
        });
        return { accountId: account.id, sentTransactions, receivedTransactions };
      }));
      return reply.send(transactions);
    } catch (err) {
      return reply.code(403).send();
    }
  });

  fastify.post('/send', async (request, reply) => {
    const { senderId, receiverId, amount, currency } = request.body

    const authHeader = request.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return reply.code(401).send()
    const jwtVerify = util.promisify(jwt.verify);
    try {
      const user = await jwtVerify(token, SECRET_KEY);

      // Check if senderId and receiverId exist in Account
      const senderAccount = await prisma.account.findUnique({ where: { id: senderId } })
      const receiverAccount = await prisma.account.findUnique({ where: { id: receiverId } })

      if (Number(senderAccount.userId) !== user.id) {
        return reply.code(403).send({ error: 'You are not authorized to access this route' })
      }

      if (!senderAccount || !receiverAccount) {
        return reply.status(400).send({ error: 'senderId or receiverId does not exist in Account' })
      }

      // Check if the sender has Balance of the requested currency
      let senderBalance = await prisma.balance.findFirst({
        where: { accountId: senderId, currency: currency },
      })

      if (!senderBalance || senderBalance.amount < amount) {
        return reply.status(400).send({ error: 'Sender does not have balance or enough money in the balance of the requested currency' })
      }

      // Start a transaction
      const transaction = await prisma.$transaction(async (prisma) => {
        // Create a new transaction
        const newTransaction = await prisma.transaction.create({
          data: {
            amount,
            currency,
            senderId,
            receiverId,
            startedAt: new Date().toISOString(),
            status: 'pending',
          },
        })

        setTimeout(() => {
          console.log("Transaction is starting for 10 seconds. Transaction ID: ", newTransaction.id)
        }, 10000)

        // Reduce balance from the sender
        senderBalance = await prisma.balance.update({
          where: { id: senderBalance.id },
          data: { amount: { decrement: amount } },
        })

        // Check if the receiver has Balance of the requested currency
        let receiverBalance = await prisma.balance.findFirst({
          where: { accountId: receiverId, currency: currency },
        })

        // If receiver does not have Balance of the requested currency, create a new Balance, else update the Balance
        if (!receiverBalance) {
          receiverBalance = await prisma.balance.create({
            data: {
              accountId: receiverId,
              amount: amount,
              currency: currency,
            },
          })
        } else {
          // Increase balance to the receiver
          receiverBalance = await prisma.balance.update({
            where: { id: receiverBalance.id },
            data: { amount: { increment: amount } },
          })
        }

        // Update the transaction status
        const updatedTransaction = await prisma.transaction.update({
          where: { id: newTransaction.id },
          data: { status: 'completed', endedAt: new Date().toISOString() },
        })

        return { newTransaction, senderBalance, receiverBalance, updatedTransaction }
      })

      return reply.send(transaction)
    } catch (err) {
      return reply.code(403).send();
    }
  })

  fastify.post('/withdraw', async (request, reply) => {
    const { accountId, amount, currency } = request.body

    const authHeader = request.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return reply.code(401).send()
    const jwtVerify = util.promisify(jwt.verify);
    try {
      const user = await jwtVerify(token, SECRET_KEY);
      // Check if account exists in the database
      const account = await prisma.account.findUnique({ where: { id: accountId } })

      if (Number(account.userId) !== user.id) {
        return reply.code(403).send({ error: 'You are not authorized to access this route' })
      }

      if (!account) {
        return reply.status(400).send({ error: 'Withdraw failed. Account does not exist.' })
      }

      // Check if the account has balance of the requested currency
      let accountBalance = await prisma.balance.findFirst({
        where: { accountId: accountId, currency: currency },
      })

      if (!accountBalance || accountBalance.amount < amount) {
        return reply.status(400).send({ error: 'Withdraw failed because account does not have enough balance of the requested currency' })
      }

      // Start a withdraw
      const transaction = await prisma.$transaction(async (prisma) => {
        // Create a new transaction
        const newTransaction = await prisma.transaction.create({
          data: {
            amount,
            currency,
            senderId: accountId,
            receiverId: accountId,
            startedAt: new Date().toISOString(),
            status: 'pending',
          },
        })

        setTimeout(() => {
          console.log("Withdrawal is starting for 10 seconds. Transaction ID: ", newTransaction.id)
        }, 10000)

        // Reduce balance from the account
        accountBalance = await prisma.balance.update({
          where: { id: accountBalance.id },
          data: { amount: { decrement: amount } },
        })

        // Update the transaction status
        const updatedTransaction = await prisma.transaction.update({
          where: { id: newTransaction.id },
          data: { status: 'completed', endedAt: new Date().toISOString() },
        })

        return { newTransaction, accountBalance, updatedTransaction }
      })

      return reply.send(transaction)
    } catch (err) {
      return reply.code(403).send();
    }
  })
  done();
})



const start = async () => {
  try {
    // Updated listen method usage
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.swagger();
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
start();