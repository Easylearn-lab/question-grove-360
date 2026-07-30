"""
Consolidate the overly-granular topics into broader categories (5-15 per specialty).
Uses LLM to group similar topics, then updates the database.
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

def get_topics_by_specialty():
    """Get all unique topics and their counts per specialty."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT specialty, topic, COUNT(*) as cnt 
        FROM questions 
        WHERE topic IS NOT NULL 
        GROUP BY specialty, topic 
        ORDER BY specialty, cnt DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    # Group by specialty
    by_specialty = {}
    for row in rows:
        spec = row['specialty']
        if spec not in by_specialty:
            by_specialty[spec] = []
        by_specialty[spec].append({"topic": row["topic"], "count": row["cnt"]})
    return by_specialty

def consolidate_specialty(specialty, topics_with_counts):
    """Ask LLM to group topics into 5-15 broader categories."""
    topic_list = "\n".join([f"- {t['topic']} ({t['count']} questions)" for t in topics_with_counts])
    
    prompt = f"""You are organizing medical education topics for the specialty: {specialty}

Here are the current granular topics and their question counts:
{topic_list}

Consolidate these into 5-15 broader topic categories that would be useful for students filtering questions. Each category should contain at least 3 questions total.

Rules:
- Merge near-duplicates and overly-specific topics into broader groups
- Keep categories clinically meaningful and useful for exam revision
- Use Title Case, 1-4 words per category
- Every original topic must map to exactly one new category
- Categories should be roughly balanced in size where possible

Return a JSON object where keys are the ORIGINAL topic names and values are the NEW broader category they belong to.
Example: {{"Cluster Headache": "Headache", "Migraine Prophylaxis": "Headache", "Tension Headache": "Headache", "Epilepsy": "Epilepsy", "Seizure": "Epilepsy"}}"""

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
            content = resp.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            if "429" in str(e):
                time.sleep((attempt + 1) * 5)
            else:
                print(f"  Error for {specialty}: {e}", file=sys.stderr)
                if attempt == 2:
                    return {}
                time.sleep(2)
    return {}

def apply_consolidation(mapping):
    """Update the database with consolidated topic names."""
    if not mapping:
        return 0
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    for old_topic, new_topic in mapping.items():
        if old_topic != new_topic:
            cursor.execute("UPDATE questions SET topic = %s WHERE topic = %s", (new_topic[:100], old_topic))
            count += cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return count

def main():
    print("Fetching topics by specialty...")
    by_specialty = get_topics_by_specialty()
    
    print(f"Found {len(by_specialty)} specialties")
    for spec, topics in by_specialty.items():
        print(f"  {spec}: {len(topics)} unique topics")
    
    total_updated = 0
    results = {}
    
    for spec, topics in by_specialty.items():
        print(f"\nConsolidating {spec} ({len(topics)} topics)...")
        if len(topics) <= 15:
            print(f"  Already <=15 topics, skipping")
            results[spec] = {t["topic"]: t["topic"] for t in topics}
            continue
        
        mapping = consolidate_specialty(spec, topics)
        if mapping:
            count = apply_consolidation(mapping)
            total_updated += count
            print(f"  Updated {count} questions")
            results[spec] = mapping
        else:
            print(f"  Failed to consolidate")
        
        time.sleep(1)  # Rate limit buffer
    
    print(f"\n{'='*50}")
    print(f"Total questions updated: {total_updated}")
    
    # Print final summary
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(DISTINCT topic) as unique_topics FROM questions WHERE topic IS NOT NULL")
    row = cursor.fetchone()
    print(f"Final unique topics: {row['unique_topics']}")
    
    cursor.execute("""
        SELECT specialty, COUNT(DISTINCT topic) as topics, COUNT(*) as questions
        FROM questions WHERE topic IS NOT NULL
        GROUP BY specialty ORDER BY questions DESC
    """)
    rows = cursor.fetchall()
    print(f"\nTopics per specialty:")
    for row in rows:
        print(f"  {row['specialty']}: {row['topics']} topics, {row['questions']} questions")
    cursor.close()
    conn.close()
    
    # Save the mapping for reference
    with open("/home/ubuntu/topic-consolidation-map.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nMapping saved to /home/ubuntu/topic-consolidation-map.json")

if __name__ == "__main__":
    main()
