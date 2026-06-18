import { createCaller } from "./routers";
import { createContext } from "./_core/context";
import { getDb } from "./db";

// Mock request/response for context
const mockReq = {
  headers: { origin: "http://localhost:3000" },
  cookies: {},
};

const mockRes = {
  clearCookie: () => {},
  setHeader: () => {},
};

async function runImport() {
  try {
    console.log("🚀 Starting MRCGP AKT questions import...\n");

    // Create context with admin user
    const ctx = await createContext({
      req: mockReq,
      res: mockRes,
    });

    // Mock admin user
    ctx.user = {
      id: 1,
      openId: "admin",
      name: "Admin",
      email: "admin@example.com",
      loginMethod: "admin",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    // Create caller
    const caller = createCaller(ctx);

    // Call import procedure
    const result = await caller.admin.importMRCGPAKTQuestions();

    console.log("✅ Import completed!");
    console.log(`   Imported: ${result.imported}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Total processed: ${result.total}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  }
}

runImport();
