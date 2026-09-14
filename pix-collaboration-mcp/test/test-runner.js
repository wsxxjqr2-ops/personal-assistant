import { AuthManager } from '../dist/auth.js';
import { RedmineClient } from '../dist/redmine-client.js';

async function runTests() {
  console.log('=== Step 1: Testing AuthManager Basic Auth ===');
  const auth = new AuthManager('https://rd.pixmoving.city');
  const session = await auth.loginWithPassword('dingcj', 'Pix@8kz6');
  console.log('Auth success:', {
    userId: session.userId,
    username: session.username,
    fullName: session.fullName,
    apiKeyLength: session.apiKey?.length,
  });

  if (!session.apiKey || session.userId !== 51) {
    throw new Error('Auth verification failed!');
  }

  console.log('\n=== Step 2: Testing RedmineClient queryIssues ===');
  const client = new RedmineClient(session.baseUrl, session.apiKey);
  const issuesRes = await client.queryIssues({ assigned_to_id: 'me', status_id: 'open', limit: 5 });
  console.log(`Successfully fetched issues: total=${issuesRes.total_count}, returned=${issuesRes.issues.length}`);
  if (issuesRes.issues.length > 0) {
    console.log(`Sample issue: #${issuesRes.issues[0].id} - ${issuesRes.issues[0].subject}`);
  }

  console.log('\n=== Step 3: Testing RedmineClient queryTimeEntries ===');
  const timeRes = await client.queryTimeEntries({ user_id: 'me', limit: 5 });
  console.log(`Successfully fetched time entries: total=${timeRes.total_count}, returned=${timeRes.time_entries.length}`);
  if (timeRes.time_entries.length > 0) {
    console.log(`Sample time entry: ${timeRes.time_entries[0].spent_on} - ${timeRes.time_entries[0].hours}h - "${timeRes.time_entries[0].comments}"`);
  }

  console.log('\n=== Step 4: Testing RedmineClient metadata (trackers & statuses) ===');
  const { trackers } = await client.getTrackers();
  const { issue_statuses } = await client.getStatuses();
  console.log(`Trackers (${trackers.length}):`, trackers.map(t => t.name).join(', '));
  console.log(`Statuses (${issue_statuses.length}):`, issue_statuses.map(s => s.name).join(', '));

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
