#!/usr/bin/env node
import fs from 'fs';
import mysql from 'mysql2/promise';

// Read environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

// Parse DATABASE_URL (format: mysql://user:password@host:port/database)
const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!urlMatch) {
  console.error('❌ Invalid DATABASE_URL format');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

const pool = mysql.createPool({
  host,
  user,
  password,
  database,
  port: parseInt(port),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function importQuestions() {
  const connection = await pool.getConnection();
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('/tmp/insert_430_questions.sql', 'utf8');
    
    // Split by INSERT statements
    const statements = sqlContent.split(/;\s*(?=INSERT)/);
    
    console.log(`📊 Total statements to execute: ${statements.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      try {
        // Ensure statement ends with semicolon
        const query = statement.endsWith(';') ? statement : statement + ';';
        
        await connection.query(query);
        successCount++;
        
        if ((i + 1) % 50 === 0) {
          console.log(`✓ Imported ${i + 1}/${statements.length} questions`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error on statement ${i + 1}:`, error.message.substring(0, 100));
        if (errorCount > 10) {
          console.error('❌ Too many errors, stopping import');
          break;
        }
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    // Verify import
    const [result] = await connection.query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN difficulty="Easy" THEN 1 END) as easy, COUNT(CASE WHEN difficulty="Medium" THEN 1 END) as medium, COUNT(CASE WHEN difficulty="Hard" THEN 1 END) as hard FROM questions WHERE examId = 1'
    );
    
    console.log(`\n📈 Final verification (examId = 1):`);
    console.log(`   Total: ${result[0].total}`);
    console.log(`   Easy: ${result[0].easy}`);
    console.log(`   Medium: ${result[0].medium}`);
    console.log(`   Hard: ${result[0].hard}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

importQuestions();
