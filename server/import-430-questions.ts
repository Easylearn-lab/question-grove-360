import fs from 'fs';
import { getDb } from './db';
import { sql } from 'drizzle-orm';

async function importQuestions() {
  try {
    console.log('📄 Reading SQL file...');
    const sqlContent = fs.readFileSync('/tmp/insert_430_questions.sql', 'utf8');
    
    console.log(`✅ SQL file loaded: ${sqlContent.length} bytes`);
    console.log('⏳ Executing SQL import...');
    
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const startTime = Date.now();
    
    // Execute raw SQL
    await db.execute(sql.raw(sqlContent));
    
    const duration = Date.now() - startTime;
    console.log(`✅ SQL executed successfully in ${duration}ms`);
    
    // Verify import
    const [result] = await db.execute(
      sql`SELECT COUNT(*) as total, COUNT(CASE WHEN difficulty='Easy' THEN 1 END) as easy, COUNT(CASE WHEN difficulty='Medium' THEN 1 END) as medium, COUNT(CASE WHEN difficulty='Hard' THEN 1 END) as hard FROM questions WHERE examId = 1`
    );
    
    console.log(`\n📈 Final verification (examId = 1):`);
    console.log(`   Total: ${result?.total || 0}`);
    console.log(`   Easy: ${result?.easy || 0}`);
    console.log(`   Medium: ${result?.medium || 0}`);
    console.log(`   Hard: ${result?.hard || 0}`);
    
    const total = result?.total || 0;
    if (total >= 430) {
      console.log(`\n🎉 SUCCESS! All 430 MRCGP AKT questions imported!`);
    } else {
      console.log(`\n⚠️  Only ${total} questions found (expected 430)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

importQuestions();
