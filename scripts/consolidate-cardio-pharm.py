"""
Consolidate Cardiovascular (22 topics) and Pharmacology & Prescribing (26 topics) 
down to ~10-15 each.
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

def run_query(sql, params=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params or ())
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def consolidate_specialty(specialty, target_count="10-12"):
    """Consolidate a specialty's topics using LLM."""
    topics = run_query("""
        SELECT topic, COUNT(*) as cnt 
        FROM questions WHERE specialty = %s AND topic IS NOT NULL 
        GROUP BY topic ORDER BY cnt DESC
    """, (specialty,))
    
    print(f"\nCurrent {specialty} topics ({len(topics)}):")
    for t in topics:
        print(f"  {t['topic']}: {t['cnt']} questions")
    
    if len(topics) <= 15:
        print(f"  Already <=15 topics, skipping")
        return
    
    topic_list = "\n".join([f"- {t['topic']} ({t['cnt']} questions)" for t in topics])
    
    prompt = f"""You are organizing {specialty} topics for a medical exam question bank (MRCGP AKT).
Current topics (too many - need to consolidate to {target_count}):

{topic_list}

Consolidate these into exactly {target_count} broader {specialty} topic categories. Rules:
- Merge related/overlapping topics into broader groups
- Remove topics that clearly don't belong in {specialty} (tag as "Miscellaneous" if needed, but avoid if possible)
- Keep categories clinically meaningful for GP exam revision
- Use Title Case, 1-4 words per category
- Aim for roughly balanced group sizes (avoid having one category with 50+ questions and another with 2)
- Every original topic must map to exactly one new category

Return a JSON object where keys are the ORIGINAL topic names and values are the NEW broader category.
"""
    
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": "You are a medical education content organizer. Output valid JSON only."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            mapping = json.loads(resp.choices[0].message.content)
            break
        except Exception as e:
            print(f"  Error: {e}")
            time.sleep(3)
            mapping = {}
    
    if mapping:
        conn = get_connection()
        cursor = conn.cursor()
        updated = 0
        for old_topic, new_topic in mapping.items():
            if old_topic != new_topic:
                cursor.execute(
                    "UPDATE questions SET topic = %s WHERE specialty = %s AND topic = %s",
                    (new_topic[:100], specialty, old_topic)
                )
                updated += cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()
        print(f"\n  Updated {updated} questions")
    
    # Print final topics
    final_topics = run_query("""
        SELECT topic, COUNT(*) as cnt 
        FROM questions WHERE specialty = %s AND topic IS NOT NULL 
        GROUP BY topic ORDER BY cnt DESC
    """, (specialty,))
    
    print(f"\n{'='*50}")
    print(f"FINAL {specialty.upper()} TOPICS ({len(final_topics)}):")
    print(f"{'='*50}")
    for t in final_topics:
        print(f"  {t['topic']}: {t['cnt']} questions")

def main():
    print("Consolidating Cardiovascular...")
    consolidate_specialty("Cardiovascular", "10-12")
    
    time.sleep(2)
    
    print("\n\nConsolidating Pharmacology & Prescribing...")
    consolidate_specialty("Pharmacology & Prescribing", "10-12")
    
    # Final overall summary
    print("\n\n" + "=" * 60)
    print("OVERALL SUMMARY:")
    print("=" * 60)
    summary = run_query("""
        SELECT specialty, COUNT(DISTINCT topic) as topics, COUNT(*) as questions
        FROM questions WHERE topic IS NOT NULL
        GROUP BY specialty ORDER BY questions DESC
    """)
    for row in summary:
        print(f"  {row['specialty']}: {row['topics']} topics, {row['questions']} questions")
    
    total = run_query("SELECT COUNT(DISTINCT topic) as cnt FROM questions WHERE topic IS NOT NULL")
    print(f"\nTotal unique topics: {total[0]['cnt']}")

if __name__ == "__main__":
    main()
