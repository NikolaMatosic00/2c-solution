import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { v4 as uuidv4 } from "uuid";
import validator from "validator";
import Database from "better-sqlite3";

const db = new Database("users.db");

// Kreiranje tabele
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  )
`,
).run();

const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    users(name: String, email: String): [User!]!
    user(id: ID!): User
  }
  
  type Mutation {
    addUser(name: String!, email: String!): User!
    deleteUser(id: ID!): Boolean
  }
`;

const resolvers = {
  Query: {
    users: (_, { name, email }) => {
      let query = "SELECT * FROM users WHERE 1=1";
      const params = [];
      if (name) {
        query += " AND name LIKE ?";
        params.push(`%${name}%`);
      }
      if (email) {
        query += " AND email LIKE ?";
        params.push(`%${email}%`);
      }
      return db.prepare(query).all(...params);
    },

    user: (_, { id }) => {
      return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    },
  },

  Mutation: {
    addUser: (_, { name, email }) => {
      if (!validator.isEmail(email)) throw new Error("Invalid email format");
      const id = uuidv4();
      try {
        db.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)").run(
          id,
          name,
          email,
        );
      } catch (e) {
        if (e.code === "SQLITE_CONSTRAINT_UNIQUE")
          throw new Error("Email already exists");
        throw e;
      }
      return { id, name, email };
    },

    deleteUser: (_, { id }) => {
      const info = db.prepare("DELETE FROM users WHERE id = ?").run(id);
      return info.changes > 0;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀 Server ready at ${url}`);
