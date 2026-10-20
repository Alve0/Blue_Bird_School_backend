import app from "./app.ts";
import { prisma } from "./lib/prisma";

const server = () => {
  prisma.$connect().then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server is running on port ${process.env.PORT || 5000}`);
    });
  });
};

server();
