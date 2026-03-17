import { createClient } from "@libsql/client";

async function testConnection() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  console.log("DB URL:", url);
  console.log("연결 시도 중...");

  const client = createClient({ url, authToken });

  try {
    const result = await client.execute("SELECT 1 as test");
    console.log("연결 성공:", result.rows);
  } catch (err) {
    console.error("연결 실패:", err);
  }

  process.exit(0);
}

testConnection();
