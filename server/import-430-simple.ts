import fs from 'fs';
import { getDb } from './db';
import { sql } from 'drizzle-orm';

async function importQuestions() {
  try {
    console.log('📄 Reading SQL file...');
    const sqlContent = fs.readFileSync('/tmp/insert_430_questions.sql', 'utf8');
    
    console.log(`✅ SQL file loaded: ${sqlContent.length} bytes`);
    
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📊 Total SQL statements: ${statements.length}`);
    console.log('⏳ Executing SQL import...');
    
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      try {
        const statement = statements[i];
        await db.execute(sql.raw(statement));
        successCount++;
        
        if ((i + 1) % 50 === 0) {
          console.log(`   ✓ Processed ${i + 1}/${statements.length} statements`);
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 3) {
          console.error(`   ❌ Error on statement ${i + 1}:`, error instanceof Error ? error.message.substring(0, 100) : String(error));
        }
        if (errorCount > 10) {
          console.error('   ❌ Too many errors, stopping import');
          break;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ SQL execution completed in ${duration}ms`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    // Verify import
    const result = await db.query.questions.findFirst({
      where: (questions, { eq }) => eq(questions.examId, 1),
      columns: { id: true },
    });
    
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM questions WHERE examId = 1`
    );
    
    console.log(`\n📈 Final verification (examId = 1):`);
    console.log(`   Total: ${(countResult as any)[0]?.cnt || 0}`);
    
    const total = (countResult as any)[0]?.cnt || 0;
    if (total >= 430) {
      console.log(`\n🎉 SUCCESS! All 430 MRCGP AKT questions imported!`);
    } else {
      console.log(`\n⚠️  Only ${total} questions found (expected 430)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

importQuestions();
