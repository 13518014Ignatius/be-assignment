const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const saltRounds = 10

async function hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(saltRounds)
      const hash = await bcrypt.hash(password, salt)
      return hash
    } catch (err) {
      console.error(err)
    }
  }

const prisma = new PrismaClient();

async function main() {
  // Create two users
  const user1 = await prisma.user.create({
    data: {
      username: 'user3',
      email: 'user3@example.com',
      name: 'User Three',
      password: await hashPassword('securepassword123'),
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'user4',
      email: 'user4@example.com',
      name: 'User Four',
      password: await hashPassword('securepassword456'),
    },
  });

  // Create one account for each user
  const account1 = await prisma.account.create({
    data: {
      type: 'Debit',
      userId: user1.id,
    },
  });

  const account2 = await prisma.account.create({
    data: {
      type: 'Debit',
      userId: user2.id,
    },
  });

  // Create one balance for each account
  await prisma.balance.create({
    data: {
      accountId: account1.id,
      amount: 1000.0,
      currency: 'USD',
    },
  });

  await prisma.balance.create({
    data: {
      accountId: account2.id,
      amount: 1500.0,
      currency: 'USD',
    },
  });
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });