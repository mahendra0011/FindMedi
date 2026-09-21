import { connectDatabase, httpServer, PORT } from "./src/app.js";

httpServer.listen(PORT, () => {
  console.log(`MindSupport Express API running on http://localhost:${PORT}`);
});

void connectDatabase();
