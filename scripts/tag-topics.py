"""
Batch-tag all AKT questions with topic labels using the built-in LLM.
Uses gpt-5-nano for cost-efficient classification.
Processes in batches of 20 questions per LLM call for efficiency.
"""
import json
import os
import sys
import time
import concurrent.futures
import mysql.connector

from openai import OpenAI

client = OpenAI()

# Load DB URL
config = json.load(open("/home/ubuntu/question-grove-360/.project-config.json"))
DB_URL = config["env_vars"]["DATABASE_URL"]

# Parse mysql URL: mysql://user:pass@host:port/db
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
    return mysql.connector.connect(
        **db_params,
        ssl_disabled=False,
        connection_timeout=30
    )

def fetch_untagged_questions(limit=2500):
    """Fetch all questions without a topic tag."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, question, specialty FROM questions WHERE topic IS NULL LIMIT %s", (limit,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def tag_batch(questions, retries=3):
    """Tag a batch of questions (up to 20) with topics using LLM."""
    q_list = []
    for q in questions:
        q_list.append(f"ID: {q['id']}\nSpecialty: {q['specialty']}\nStem: {q['question'][:300]}")
    
    prompt = f"""For each question below, assign a concise topic tag (1-4 words) that describes the specific clinical topic within its specialty.

Rules:
- Topic should be specific enough to be useful for filtering (e.g., "Headache" not "Neurology")
- Topic should be general enough to group 5-20 questions together (e.g., "Migraine" is too narrow, "Headache" is better)
- Use standard medical terminology in Title Case
- Examples: "Headache", "Epilepsy", "Type 2 Diabetes", "Asthma", "Heart Failure", "Eczema", "Consent", "Screening"

Questions:
{chr(10).join(q_list)}

Return ONLY a JSON object mapping question ID (as string) to topic tag. Example: {{"123": "Headache", "456": "Epilepsy"}}"""

    for attempt in range(retries):
        try:
            resp = client.chat.completions.create(
                model="gpt-5-nano",
                messages=[
                    {"role": "system", "content": "You are a medical education content classifier. Output valid JSON only. Return a flat JSON object mapping question ID strings to topic strings."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            content = resp.choices[0].message.content
            data = json.loads(content)
            # Handle nested structure if present
            if "tags" in data and isinstance(data["tags"], dict):
                return data["tags"]
            return data
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "rate_limit" in err_str:
                wait_time = (attempt + 1) * 5
                time.sleep(wait_time)
            elif attempt < retries - 1:
                time.sleep(2)
            else:
                print(f"  LLM error after {retries} retries: {e}", file=sys.stderr)
                return {}
    return {}

def update_topics(tag_map):
    """Update the topic column for tagged questions."""
    if not tag_map:
        return 0
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    for qid, topic in tag_map.items():
        try:
            cursor.execute("UPDATE questions SET topic = %s WHERE id = %s", (str(topic)[:100], int(qid)))
            count += 1
        except Exception as e:
            print(f"  DB update error for {qid}: {e}", file=sys.stderr)
    conn.commit()
    cursor.close()
    conn.close()
    return count

def main():
    print("Fetching untagged questions...")
    questions = fetch_untagged_questions()
    total = len(questions)
    print(f"Found {total} untagged questions")
    
    if total == 0:
        print("All questions already tagged!")
        return
    
    # Process in batches of 20
    batch_size = 20
    batches = [questions[i:i+batch_size] for i in range(0, total, batch_size)]
    print(f"Processing {len(batches)} batches of up to {batch_size} questions each...")
    
    tagged_total = 0
    failed_total = 0
    
    # Use concurrent processing with 3 workers to avoid rate limits
    def process_batch(batch_idx_and_batch):
        idx, batch = batch_idx_and_batch
        tags = tag_batch(batch)
        if tags:
            count = update_topics(tags)
            return (idx, count, len(batch) - count)
        return (idx, 0, len(batch))
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = list(executor.map(process_batch, enumerate(batches)))
    
    for idx, success, fail in futures:
        tagged_total += success
        failed_total += fail
        if (idx + 1) % 10 == 0:
            print(f"  Progress: {(idx+1)*batch_size}/{total} processed, {tagged_total} tagged")
    
    print(f"\nDone! Tagged {tagged_total} questions, {failed_total} failed")
    
    # Print summary
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) as total FROM questions WHERE topic IS NOT NULL")
    row = cursor.fetchone()
    print(f"Total questions with topics: {row['total']}")
    cursor.execute("SELECT COUNT(DISTINCT topic) as unique_topics FROM questions WHERE topic IS NOT NULL")
    row = cursor.fetchone()
    print(f"Unique topics: {row['unique_topics']}")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
