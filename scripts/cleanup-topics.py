"""
Clean up topic cross-contamination and consolidate Neurology topics.
1. Fix cross-contamination across all specialties
2. Consolidate Neurology from 29 to ~12 topics
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

def run_update(sql, params=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params or ())
    affected = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return affected

def retag_questions_with_llm(questions, specialty):
    """Re-tag a set of questions that have cross-contamination issues."""
    q_list = []
    for q in questions:
        q_list.append(f"ID: {q['id']}\nStem: {q['question'][:250]}")
    
    prompt = f"""These questions are in the {specialty} specialty but have been tagged with topics that don't belong to this specialty. 
Please assign each question a topic that is appropriate for {specialty}.

Use concise, clinically relevant topic names (1-4 words, Title Case).
The topic should describe what the question is actually testing within {specialty}.

Questions:
{chr(10).join(q_list)}

Return a JSON object mapping question ID (string) to the correct topic. Example: {{"123": "Stroke & Vascular"}}"""

    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": "You are a medical education content classifier. Output valid JSON only."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            if "429" in str(e):
                time.sleep((attempt + 1) * 5)
            else:
                print(f"  Error: {e}", file=sys.stderr)
                time.sleep(2)
    return {}

def main():
    print("=" * 60)
    print("STEP 1: Fix cross-contamination across all specialties")
    print("=" * 60)
    
    # Define topics that clearly don't belong in certain specialties
    # We'll identify them by checking if a topic name matches another specialty name
    specialty_names = [
        "Neurology", "Respiratory", "Cardiovascular", "Endocrinology",
        "Dermatology", "Gastroenterology", "Renal & Urology",
        "Ethics & Organisational", "Musculoskeletal", "Obstetrics & Gynaecology",
        "Statistics & EBM", "Haematology", "Ophthalmology", "Paediatrics",
        "Pharmacology & Prescribing", "Infectious Disease", "General Practice",
        "ENT", "Psychiatry"
    ]
    
    # Find topics that seem to belong to other specialties
    print("\nChecking for cross-contamination...")
    
    # Get all specialty-topic combinations
    all_topics = run_query("""
        SELECT specialty, topic, COUNT(*) as cnt 
        FROM questions WHERE topic IS NOT NULL 
        GROUP BY specialty, topic 
        ORDER BY specialty, cnt DESC
    """)
    
    # Identify suspicious topics (topic name contains another specialty name, or is clearly wrong)
    suspicious_patterns = {
        "Neurology": ["Psychiatry", "Cardiometabolic", "Primary Care & Misc"],
        "Cardiovascular": ["Acute Respiratory Emergencies", "Acute Neurology"],
        "Respiratory": ["Acute Neurology", "Cardiovascular Drugs", "GI Infections", "Throat And Neck", "HIV"],
        "Endocrinology": [],
        "Dermatology": [],
        "Gastroenterology": [],
    }
    
    # Also find any topic that exactly matches a different specialty name
    for row in all_topics:
        spec = row["specialty"]
        topic = row["topic"]
        for other_spec in specialty_names:
            if topic == other_spec and topic != spec:
                if spec not in suspicious_patterns:
                    suspicious_patterns[spec] = []
                if topic not in suspicious_patterns[spec]:
                    suspicious_patterns[spec].append(topic)
    
    total_fixed = 0
    for spec, bad_topics in suspicious_patterns.items():
        if not bad_topics:
            continue
        for bad_topic in bad_topics:
            questions = run_query(
                "SELECT id, question FROM questions WHERE specialty = %s AND topic = %s",
                (spec, bad_topic)
            )
            if not questions:
                continue
            print(f"\n  {spec} / '{bad_topic}': {len(questions)} questions to re-tag")
            
            new_tags = retag_questions_with_llm(questions, spec)
            if new_tags:
                conn = get_connection()
                cursor = conn.cursor()
                for qid, new_topic in new_tags.items():
                    cursor.execute("UPDATE questions SET topic = %s WHERE id = %s", (new_topic[:100], int(qid)))
                    total_fixed += 1
                conn.commit()
                cursor.close()
                conn.close()
                print(f"    Re-tagged {len(new_tags)} questions")
            time.sleep(1)
    
    print(f"\nTotal cross-contamination fixes: {total_fixed}")
    
    print("\n" + "=" * 60)
    print("STEP 2: Consolidate Neurology from 29 to ~12 topics")
    print("=" * 60)
    
    # Get current Neurology topics
    neuro_topics = run_query("""
        SELECT topic, COUNT(*) as cnt 
        FROM questions WHERE specialty = 'Neurology' AND topic IS NOT NULL 
        GROUP BY topic ORDER BY cnt DESC
    """)
    
    print(f"\nCurrent Neurology topics ({len(neuro_topics)}):")
    for t in neuro_topics:
        print(f"  {t['topic']}: {t['cnt']} questions")
    
    if len(neuro_topics) > 15:
        topic_list = "\n".join([f"- {t['topic']} ({t['cnt']} questions)" for t in neuro_topics])
        
        prompt = f"""You are organizing Neurology topics for a medical exam question bank.
Current topics (too many - need to consolidate to 10-12):

{topic_list}

Consolidate these into exactly 10-12 broader Neurology topic categories. Rules:
- Merge related topics (e.g., "Mood Disorders" + "Anxiety & Trauma" → "Neuropsychiatry")
- Remove topics that don't belong in Neurology (move to a generic "Miscellaneous" if needed)
- Keep categories clinically meaningful for MRCGP AKT exam revision
- Use Title Case, 1-4 words per category
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
            neuro_updated = 0
            for old_topic, new_topic in mapping.items():
                if old_topic != new_topic:
                    cursor.execute(
                        "UPDATE questions SET topic = %s WHERE specialty = 'Neurology' AND topic = %s",
                        (new_topic[:100], old_topic)
                    )
                    neuro_updated += cursor.rowcount
            conn.commit()
            cursor.close()
            conn.close()
            print(f"\n  Updated {neuro_updated} Neurology questions")
    
    # Print final Neurology topics
    print("\n" + "=" * 60)
    print("FINAL NEUROLOGY TOPICS:")
    print("=" * 60)
    neuro_final = run_query("""
        SELECT topic, COUNT(*) as cnt 
        FROM questions WHERE specialty = 'Neurology' AND topic IS NOT NULL 
        GROUP BY topic ORDER BY cnt DESC
    """)
    for t in neuro_final:
        print(f"  {t['topic']}: {t['cnt']} questions")
    print(f"\nTotal: {len(neuro_final)} topics")
    
    # Print overall summary
    print("\n" + "=" * 60)
    print("OVERALL SUMMARY:")
    print("=" * 60)
    summary = run_query("""
        SELECT specialty, COUNT(DISTINCT topic) as topics, COUNT(*) as questions
        FROM questions WHERE topic IS NOT NULL
        GROUP BY specialty ORDER BY questions DESC
    """)
    for row in summary:
        print(f"  {row['specialty']}: {row['topics']} topics, {row['questions']} questions")
    
    total_topics = run_query("SELECT COUNT(DISTINCT topic) as cnt FROM questions WHERE topic IS NOT NULL")
    print(f"\nTotal unique topics: {total_topics[0]['cnt']}")

if __name__ == "__main__":
    main()
