import Database from 'better-sqlite3';

const db = new Database('pr-agent.db');

console.log('=== Database Analysis ===\n');

// Check total records
const total = db.prepare('SELECT COUNT(*) as count FROM pr_analysis').get();
console.log(`Total records: ${total.count}\n`);

// Check latest 3 records
const latest = db.prepare('SELECT id, title, complexity, risks_count, peer_review_enabled, ticket_key, ac_compliance_percentage, timestamp FROM pr_analysis ORDER BY id DESC LIMIT 3').all();
console.log('Latest 3 records:');
console.table(latest);

// Check peer review stats
const peerReviewStats = db.prepare(`
  SELECT
    COUNT(*) as total_analyses,
    SUM(CASE WHEN peer_review_enabled = 1 THEN 1 ELSE 0 END) as with_peer_review,
    AVG(ac_compliance_percentage) as avg_ac_compliance,
    AVG(ticket_quality_score) as avg_ticket_quality
  FROM pr_analysis
`).get();
console.log('\n=== Peer Review Stats ===');
console.table(peerReviewStats);

db.close();
