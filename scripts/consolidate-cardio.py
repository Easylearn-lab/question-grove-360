"""
Force consolidation of Cardiovascular from 22 topics down to 10-12.
The previous attempt failed because the LLM returned identity mappings.
This time we'll be more explicit about what to merge.
"""
import json
import sys
import time
import mysql.connector
from openai import OpenAI

client = OpenAI()

config = json.load(open("/home/ubuntu/question-grove-360/.project-config.json"))
DB_URL = config["env_vars"]["DATABASE_URL"]

def parse_db_url(url):
    url = url.replace("mysql://", "")
    if "?" in url:
        url = url.split("?")[0]
    user_pass, host_db = url.split("@")
    user, password = user_pass.split(":", 1)
    host_port, db = host_db.split("/")
    if ":" in host_port:
        host, port = host_port.split(":")
        port = int(port)
    else:
        host = host_port
        port = 3306
    return {"user": user, "password": password, "host": host, "port": port, "database": db}

db_params = parse_db_url(DB_URL)

def get_connection():
    return mysql.connector.connect(**db_params, ssl_disabled=False, connection_timeout=30)

def run_update(sql, params=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params or ())
    affected = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return affected

def run_query(sql, params=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params or ())
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def main():
    # Manual merge map based on clinical logic:
    # Heart Failure subtopics → "Heart Failure"
    # Small cardio subtopics → merge into larger related groups
    merge_map = {
        # Heart failure cluster → merge into "Heart Failure"
        "Heart Failure Diagnosis": "Heart Failure",
        "ARNI Therapy": "Heart Failure",
        "HFrEF Management": "Heart Failure",
        "Heart Failure Clinical Features": "Heart Failure",
        "Aldosterone Antagonists": "Heart Failure",
        "Acute Heart Failure": "Heart Failure",
        "Beta-Blocker Therapy": "Heart Failure",
        "HFpEF": "Heart Failure",
        "Jugular Venous Pressure": "Heart Failure",
        # Rate control → merge into Arrhythmias
        "Rate Control In AF": "Arrhythmias & Conduction",
        # General Medicine → merge into Pharmacology & Therapies
        "General Medicine": "Pharmacology & Therapies",
        # Electrolytes → merge into General Medicine / Misc
        "Electrolytes & Metabolism": "Pharmacology & Therapies",
        # Research → keep
        # Stroke → keep
        # Hypertension & Pregnancy → rename to just "Hypertension"
        "Hypertension & Pregnancy": "Hypertension",
    }
    
    print("Applying Cardiovascular topic consolidation...")
    total = 0
    for old_topic, new_topic in merge_map.items():
        affected = run_update(
            "UPDATE questions SET topic = %s WHERE specialty = 'Cardiovascular' AND topic = %s",
            (new_topic, old_topic)
        )
        if affected > 0:
            print(f"  '{old_topic}' → '{new_topic}': {affected} questions")
            total += affected
    
    print(f"\nTotal updated: {total}")
    
    # Print final topics
    final_topics = run_query("""
        SELECT topic, COUNT(*) as cnt 
        FROM questions WHERE specialty = 'Cardiovascular' AND topic IS NOT NULL 
        GROUP BY topic ORDER BY cnt DESC
    """)
    
    print(f"\nFINAL CARDIOVASCULAR TOPICS ({len(final_topics)}):")
    print("=" * 50)
    for t in final_topics:
        print(f"  {t['topic']}: {t['cnt']} questions")

if __name__ == "__main__":
    main()
