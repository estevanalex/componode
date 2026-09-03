import { db } from "../db/connection.js";

export async function recoverRuns(): Promise<void> {
  const now = new Date().toISOString();

  const runs = await db
    .selectFrom("import_runs")
    .select(["id", "status", "cancelRequestedAt"])
    .where("status", "in", ["PENDING", "RUNNING"])
    .execute();

  for (const run of runs) {
    if (run.status === "PENDING") {
      await db
        .updateTable("import_runs")
        .set({ status: "INTERRUPTED", completedAt: now })
        .where("id", "=", run.id)
        .execute();
    } else if (run.cancelRequestedAt !== null) {
      await db
        .updateTable("import_runs")
        .set({ status: "CANCELLED", completedAt: now })
        .where("id", "=", run.id)
        .execute();
    } else {
      await db
        .updateTable("import_runs")
        .set({ status: "INTERRUPTED", completedAt: now })
        .where("id", "=", run.id)
        .execute();
    }
  }
}
