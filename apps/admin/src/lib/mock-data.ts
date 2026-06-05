// Demo mode — all mock data and request handler.
// Activated when localStorage token === 'demo'.

export const DEMO_EMAIL = 'demo@clockwork.app';
export const DEMO_PASSWORD = 'demo1234';

// ─── Users ────────────────────────────────────────────────────────────────────

const U = {
  sarah:   { id: 'usr-001', name: 'Sarah Chen',       email: 'sarah@clockwork.app',   role: 'admin',  isActive: true,  timezone: 'America/New_York', weeklyHours: 32.5, createdAt: '2024-01-10T09:00:00Z' },
  james:   { id: 'usr-002', name: 'James Wilson',     email: 'james@clockwork.app',   role: 'member', isActive: true,  timezone: 'America/Chicago',  weeklyHours: 28.0, createdAt: '2024-01-15T09:00:00Z' },
  priya:   { id: 'usr-003', name: 'Priya Patel',      email: 'priya@clockwork.app',   role: 'member', isActive: true,  timezone: 'America/Los_Angeles', weeklyHours: 25.5, createdAt: '2024-02-01T09:00:00Z' },
  marcus:  { id: 'usr-004', name: 'Marcus Johnson',   email: 'marcus@clockwork.app',  role: 'member', isActive: true,  timezone: 'Europe/London',    weeklyHours: 18.0, createdAt: '2024-02-15T09:00:00Z' },
  emily:   { id: 'usr-005', name: 'Emily Rodriguez',  email: 'emily@clockwork.app',   role: 'member', isActive: false, timezone: 'America/New_York',  weeklyHours: 0,    createdAt: '2024-03-01T09:00:00Z' },
  alex:    { id: 'usr-006', name: 'Alex Kim',         email: 'alex@clockwork.app',    role: 'member', isActive: true,  timezone: 'Asia/Seoul',       weeklyHours: 12.5, createdAt: '2024-03-20T09:00:00Z' },
};
const USERS = Object.values(U);

// ─── Projects ─────────────────────────────────────────────────────────────────

const P = {
  web:     { id: 'prj-001', name: 'Website Redesign',        color: '#6366F1', isArchived: false, createdBy: 'usr-001', totalHours: 145.5, createdAt: '2024-01-12T09:00:00Z', description: 'Full redesign of the company website' },
  mobile:  { id: 'prj-002', name: 'Mobile App v2',           color: '#EC4899', isArchived: false, createdBy: 'usr-001', totalHours: 89.0,  createdAt: '2024-01-20T09:00:00Z', description: 'Cross-platform mobile app rewrite' },
  infra:   { id: 'prj-003', name: 'Backend Infrastructure',  color: '#10B981', isArchived: false, createdBy: 'usr-001', totalHours: 63.5,  createdAt: '2024-02-05T09:00:00Z', description: 'Microservices migration and CI/CD' },
  mkt:     { id: 'prj-004', name: 'Marketing Campaign',      color: '#F59E0B', isArchived: false, createdBy: 'usr-001', totalHours: 42.0,  createdAt: '2024-03-01T09:00:00Z', description: 'Q2 product launch campaign' },
  legacy:  { id: 'prj-005', name: 'Legacy API Cleanup',      color: '#8B5CF6', isArchived: true,  createdBy: 'usr-001', totalHours: 28.0,  createdAt: '2023-11-01T09:00:00Z', description: 'Deprecated endpoints removal' },
};
const PROJECTS = Object.values(P);

// ─── Time Entries ─────────────────────────────────────────────────────────────

function daysAgo(n: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function addHours(iso: string, h: number) {
  return new Date(new Date(iso).getTime() + h * 3600_000).toISOString();
}

const ENTRIES = [
  // Today
  { id: 'te-001', user_id: 'usr-002', project_id: 'prj-001', description: 'Hero section responsive layout', started_at: daysAgo(0, 9, 0),  ended_at: addHours(daysAgo(0, 9, 0), 2.5), duration_seconds: 9000,  status: 'stopped', user: U.james,  project: P.web   },
  { id: 'te-002', user_id: 'usr-003', project_id: 'prj-002', description: 'Authentication flow screens',   started_at: daysAgo(0, 10, 0), ended_at: addHours(daysAgo(0, 10, 0), 1.5), duration_seconds: 5400, status: 'stopped', user: U.priya,  project: P.mobile },
  { id: 'te-003', user_id: 'usr-001', project_id: 'prj-001', description: 'Design review with client',     started_at: daysAgo(0, 8, 30), ended_at: addHours(daysAgo(0, 8, 30), 1.0), duration_seconds: 3600, status: 'stopped', user: U.sarah,  project: P.web   },
  { id: 'te-004', user_id: 'usr-004', project_id: 'prj-003', description: 'Docker Compose refactor',       started_at: daysAgo(0, 9, 30), ended_at: addHours(daysAgo(0, 9, 30), 3.0), duration_seconds: 10800, status: 'stopped', user: U.marcus, project: P.infra },

  // Yesterday
  { id: 'te-005', user_id: 'usr-001', project_id: 'prj-001', description: 'Navigation component',          started_at: daysAgo(1, 9, 0),  ended_at: addHours(daysAgo(1, 9, 0), 2.0),  duration_seconds: 7200,  status: 'stopped', user: U.sarah,  project: P.web    },
  { id: 'te-006', user_id: 'usr-002', project_id: 'prj-001', description: 'Blog listing page',             started_at: daysAgo(1, 10, 30),ended_at: addHours(daysAgo(1, 10, 30), 3.5), duration_seconds: 12600, status: 'stopped', user: U.james,  project: P.web    },
  { id: 'te-007', user_id: 'usr-003', project_id: 'prj-002', description: 'Push notification setup',       started_at: daysAgo(1, 9, 0),  ended_at: addHours(daysAgo(1, 9, 0), 4.0),  duration_seconds: 14400, status: 'stopped', user: U.priya,  project: P.mobile },
  { id: 'te-008', user_id: 'usr-004', project_id: 'prj-003', description: 'Kubernetes deployment',         started_at: daysAgo(1, 13, 0), ended_at: addHours(daysAgo(1, 13, 0), 2.5), duration_seconds: 9000,  status: 'stopped', user: U.marcus, project: P.infra  },
  { id: 'te-009', user_id: 'usr-006', project_id: 'prj-004', description: 'Social media copy',             started_at: daysAgo(1, 10, 0), ended_at: addHours(daysAgo(1, 10, 0), 2.0), duration_seconds: 7200,  status: 'stopped', user: U.alex,   project: P.mkt    },

  // 2 days ago
  { id: 'te-010', user_id: 'usr-001', project_id: 'prj-001', description: 'Footer redesign',               started_at: daysAgo(2, 9, 0),  ended_at: addHours(daysAgo(2, 9, 0), 1.5),  duration_seconds: 5400,  status: 'stopped', user: U.sarah,  project: P.web   },
  { id: 'te-011', user_id: 'usr-002', project_id: 'prj-001', description: 'Contact form validation',       started_at: daysAgo(2, 11, 0), ended_at: addHours(daysAgo(2, 11, 0), 2.0), duration_seconds: 7200,  status: 'stopped', user: U.james,  project: P.web   },
  { id: 'te-012', user_id: 'usr-003', project_id: 'prj-002', description: 'Offline mode implementation',  started_at: daysAgo(2, 9, 30), ended_at: addHours(daysAgo(2, 9, 30), 5.0),  duration_seconds: 18000, status: 'stopped', user: U.priya,  project: P.mobile },
  { id: 'te-013', user_id: 'usr-004', project_id: 'prj-003', description: 'Redis caching layer',           started_at: daysAgo(2, 10, 0), ended_at: addHours(daysAgo(2, 10, 0), 3.5), duration_seconds: 12600, status: 'stopped', user: U.marcus, project: P.infra  },
  { id: 'te-014', user_id: 'usr-006', project_id: 'prj-004', description: 'Email campaign draft',          started_at: daysAgo(2, 14, 0), ended_at: addHours(daysAgo(2, 14, 0), 1.5), duration_seconds: 5400,  status: 'stopped', user: U.alex,   project: P.mkt    },

  // 3 days ago
  { id: 'te-015', user_id: 'usr-001', project_id: 'prj-003', description: 'AWS cost review',               started_at: daysAgo(3, 9, 0),  ended_at: addHours(daysAgo(3, 9, 0), 2.0),  duration_seconds: 7200,  status: 'stopped', user: U.sarah,  project: P.infra  },
  { id: 'te-016', user_id: 'usr-002', project_id: 'prj-002', description: 'iOS deep links',                started_at: daysAgo(3, 10, 0), ended_at: addHours(daysAgo(3, 10, 0), 4.5), duration_seconds: 16200, status: 'stopped', user: U.james,  project: P.mobile },
  { id: 'te-017', user_id: 'usr-003', project_id: 'prj-001', description: 'Accessibility audit fixes',     started_at: daysAgo(3, 9, 0),  ended_at: addHours(daysAgo(3, 9, 0), 3.0),  duration_seconds: 10800, status: 'stopped', user: U.priya,  project: P.web    },
  { id: 'te-018', user_id: 'usr-004', project_id: 'prj-003', description: 'Database index optimization',   started_at: daysAgo(3, 13, 0), ended_at: addHours(daysAgo(3, 13, 0), 3.0), duration_seconds: 10800, status: 'stopped', user: U.marcus, project: P.infra  },
  { id: 'te-019', user_id: 'usr-006', project_id: 'prj-004', description: 'Landing page copy',             started_at: daysAgo(3, 11, 0), ended_at: addHours(daysAgo(3, 11, 0), 3.0), duration_seconds: 10800, status: 'stopped', user: U.alex,   project: P.mkt    },

  // 4 days ago
  { id: 'te-020', user_id: 'usr-001', project_id: 'prj-001', description: 'Brand guidelines integration',  started_at: daysAgo(4, 9, 0),  ended_at: addHours(daysAgo(4, 9, 0), 3.0),  duration_seconds: 10800, status: 'stopped', user: U.sarah,  project: P.web    },
  { id: 'te-021', user_id: 'usr-002', project_id: 'prj-001', description: 'CMS integration',               started_at: daysAgo(4, 10, 0), ended_at: addHours(daysAgo(4, 10, 0), 4.0), duration_seconds: 14400, status: 'stopped', user: U.james,  project: P.web    },
  { id: 'te-022', user_id: 'usr-003', project_id: 'prj-002', description: 'Biometric authentication',      started_at: daysAgo(4, 9, 30), ended_at: addHours(daysAgo(4, 9, 30), 4.5), duration_seconds: 16200, status: 'stopped', user: U.priya,  project: P.mobile },
  { id: 'te-023', user_id: 'usr-004', project_id: 'prj-003', description: 'Monitoring dashboards',         started_at: daysAgo(4, 9, 0),  ended_at: addHours(daysAgo(4, 9, 0), 2.5),  duration_seconds: 9000,  status: 'stopped', user: U.marcus, project: P.infra  },

  // 5 days ago
  { id: 'te-024', user_id: 'usr-001', project_id: 'prj-004', description: 'Q2 campaign planning',          started_at: daysAgo(5, 9, 0),  ended_at: addHours(daysAgo(5, 9, 0), 2.0),  duration_seconds: 7200,  status: 'stopped', user: U.sarah,  project: P.mkt    },
  { id: 'te-025', user_id: 'usr-002', project_id: 'prj-001', description: 'Analytics integration',         started_at: daysAgo(5, 11, 0), ended_at: addHours(daysAgo(5, 11, 0), 3.0), duration_seconds: 10800, status: 'stopped', user: U.james,  project: P.web    },
  { id: 'te-026', user_id: 'usr-003', project_id: 'prj-002', description: 'Dark mode support',             started_at: daysAgo(5, 10, 0), ended_at: addHours(daysAgo(5, 10, 0), 3.5), duration_seconds: 12600, status: 'stopped', user: U.priya,  project: P.mobile },
  { id: 'te-027', user_id: 'usr-006', project_id: 'prj-004', description: 'Ad creative assets',            started_at: daysAgo(5, 9, 0),  ended_at: addHours(daysAgo(5, 9, 0), 4.0),  duration_seconds: 14400, status: 'stopped', user: U.alex,   project: P.mkt    },

  // 6 days ago
  { id: 'te-028', user_id: 'usr-001', project_id: 'prj-003', description: 'CI/CD pipeline review',         started_at: daysAgo(6, 9, 0),  ended_at: addHours(daysAgo(6, 9, 0), 2.5),  duration_seconds: 9000,  status: 'stopped', user: U.sarah,  project: P.infra  },
  { id: 'te-029', user_id: 'usr-002', project_id: 'prj-001', description: 'Performance audit',             started_at: daysAgo(6, 10, 0), ended_at: addHours(daysAgo(6, 10, 0), 2.0), duration_seconds: 7200,  status: 'stopped', user: U.james,  project: P.web    },
  { id: 'te-030', user_id: 'usr-003', project_id: 'prj-002', description: 'QA test suite',                 started_at: daysAgo(6, 9, 0),  ended_at: addHours(daysAgo(6, 9, 0), 5.5),  duration_seconds: 19800, status: 'stopped', user: U.priya,  project: P.mobile },
  { id: 'te-031', user_id: 'usr-004', project_id: 'prj-003', description: 'Load balancer config',          started_at: daysAgo(6, 10, 30),ended_at: addHours(daysAgo(6, 10, 30), 3.5), duration_seconds: 12600, status: 'stopped', user: U.marcus, project: P.infra  },
  { id: 'te-032', user_id: 'usr-006', project_id: 'prj-004', description: 'Competitor analysis',           started_at: daysAgo(6, 14, 0), ended_at: addHours(daysAgo(6, 14, 0), 2.0), duration_seconds: 7200,  status: 'stopped', user: U.alex,   project: P.mkt    },

  // Older
  { id: 'te-033', user_id: 'usr-001', project_id: 'prj-001', description: 'Stakeholder presentation',      started_at: daysAgo(8, 14, 0), ended_at: addHours(daysAgo(8, 14, 0), 1.5), duration_seconds: 5400,  status: 'stopped', user: U.sarah,  project: P.web    },
  { id: 'te-034', user_id: 'usr-002', project_id: 'prj-002', description: 'API integration testing',       started_at: daysAgo(9, 10, 0), ended_at: addHours(daysAgo(9, 10, 0), 3.0), duration_seconds: 10800, status: 'stopped', user: U.james,  project: P.mobile },
  { id: 'te-035', user_id: 'usr-003', project_id: 'prj-003', description: 'API endpoint documentation',   started_at: daysAgo(10, 9, 0), ended_at: addHours(daysAgo(10, 9, 0), 2.5), duration_seconds: 9000,  status: 'stopped', user: U.priya,  project: P.infra  },
];

// ─── Active Members ───────────────────────────────────────────────────────────

function nowMinus(seconds: number) {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

const ACTIVE_MEMBERS = [
  { userId: 'usr-002', name: 'James Wilson',  email: 'james@clockwork.app',  projectName: 'Website Redesign',       description: 'Hero section responsive layout', elapsedSeconds: 4980,  startedAt: nowMinus(4980)  },
  { userId: 'usr-003', name: 'Priya Patel',   email: 'priya@clockwork.app',  projectName: 'Mobile App v2',           description: 'Authentication flow screens',   elapsedSeconds: 2700,  startedAt: nowMinus(2700)  },
  { userId: 'usr-006', name: 'Alex Kim',      email: 'alex@clockwork.app',   projectName: 'Backend Infrastructure',  description: 'Docker Compose refactor',       elapsedSeconds: 7800,  startedAt: nowMinus(7800)  },
];

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

function buildWeeklyChart() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = [2.0, 28.5, 31.0, 35.5, 26.0, 22.5, 0.0];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayIdx = d.getDay();
    return {
      day: days[dayIdx] as string,
      date: d.toISOString().split('T')[0] as string,
      hours: hours[i] as number,
    };
  });
}

// ─── Screenshots ──────────────────────────────────────────────────────────────

function seededInt(a: number, b: number, min: number, max: number): number {
  const n = Math.abs((a * 1664525 + b * 1013904223) | 0);
  return min + (n % (max - min + 1));
}

export interface MockScreenshot {
  id: string;
  userId: string;
  timeEntryId: string;
  storagePath: string;
  capturedAt: string;
  activityPercent: number;
  keyEvents: number;
  mouseEvents: number;
  user: { id: string; name: string; email: string };
}

export function getMockScreenshotsForEntry(entryId: string): MockScreenshot[] {
  const entry = ENTRIES.find(e => e.id === entryId);
  if (!entry || !entry.duration_seconds || entry.duration_seconds < 600) return [];

  const INTERVAL = 600; // 10-minute screenshots
  const count = Math.min(12, Math.floor(entry.duration_seconds / INTERVAL));
  const startMs = new Date(entry.started_at).getTime();
  const seed = entryId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  return Array.from({ length: count }, (_, i) => {
    const pct = seededInt(seed, i * 37, 52, 97);
    const keys = seededInt(seed, i * 53, Math.floor(pct * 2.5), Math.floor(pct * 4.5));
    const mouse = seededInt(seed, i * 71, Math.floor(pct * 1.2), Math.floor(pct * 2.8));
    return {
      id: `ss-${entryId}-${i}`,
      userId: entry.user_id,
      timeEntryId: entryId,
      storagePath: `demo/${entryId}/${i}.png`,
      capturedAt: new Date(startMs + (i + 1) * INTERVAL * 1000).toISOString(),
      activityPercent: pct,
      keyEvents: keys,
      mouseEvents: mouse,
      user: entry.user as MockScreenshot['user'],
    };
  });
}

// ─── Mock Response Router ─────────────────────────────────────────────────────

function basePath(path: string) { return path.split('?')[0]; }
function qp(path: string) { return new URLSearchParams(path.includes('?') ? path.split('?')[1] : ''); }

function paginateEntries(path: string) {
  const params = qp(path);
  const page = parseInt(params.get('page') ?? '1', 10);
  const limit = parseInt(params.get('limit') ?? '20', 10);
  const userId = params.get('userId');
  const projectId = params.get('projectId');

  let filtered = ENTRIES.slice();
  if (userId) filtered = filtered.filter(e => e.user_id === userId);
  if (projectId) filtered = filtered.filter(e => e.project_id === projectId);

  const total = filtered.length;
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getMockResponse(path: string): unknown {
  const base = basePath(path);

  // Auth
  if (base === '/auth/login' || base === '/auth/me') {
    return { ...U.sarah };
  }
  if (base === '/auth/logout') return { success: true };

  // Users
  if (base === '/users') return USERS;
  if (base === '/users/me') return {
    ...U.sarah,
    recentEntries: ENTRIES.filter(e => e.user_id === 'usr-001').slice(0, 10),
  };
  const userMatch = base.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    const u = USERS.find(x => x.id === userMatch[1]) ?? U.sarah;
    return {
      ...u,
      recentEntries: ENTRIES.filter(e => e.user_id === u.id).slice(0, 10),
    };
  }

  // Projects
  if (base === '/projects') return PROJECTS;
  const projMatch = base.match(/^\/projects\/([^/]+)$/);
  if (projMatch) return PROJECTS.find(p => p.id === projMatch[1]) ?? PROJECTS[0];

  // Time entries
  if (base === '/time-entries') return paginateEntries(path);
  if (base === '/time-entries/active') return ACTIVE_MEMBERS;

  // Screenshots
  if (base === '/screenshots') {
    const timeEntryId = qp(path).get('timeEntryId');
    if (timeEntryId) {
      const shots = getMockScreenshotsForEntry(timeEntryId);
      return { data: shots, total: shots.length, page: 1, limit: 50, totalPages: 1 };
    }
    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  // Reports
  if (base === '/reports/stats') return {
    todayHours: 12.5,
    activeNow: ACTIVE_MEMBERS.length,
    screenshotsToday: 47,
    weeklyHours: 145.5,
    weeklyChange: 12,
  };
  if (base === '/reports/weekly-chart') return buildWeeklyChart();

  // Config
  if (base === '/config') return {
    screenshotIntervalMinutes: 10,
    companyName: 'Clockwork Demo',
    timezone: 'America/New_York',
    slackWebhookUrl: '',
  };

  // Webhooks
  if (base === '/webhooks/slack/test') return { success: false, message: 'No Slack webhook configured in demo mode' };

  // Fallbacks for mutations (invite, create project, update, delete)
  return { success: true };
}

// ─── Mock CSV / HTML for Reports export ───────────────────────────────────────

export function getMockCsv(): string {
  const header = 'Date,User,Email,Project,Description,Duration (hours)';
  const rows = ENTRIES.map(e => {
    const date = new Date(e.started_at).toISOString().split('T')[0];
    const hours = (e.duration_seconds / 3600).toFixed(2);
    const desc = (e.description ?? '').replace(/"/g, '""');
    return `${date},"${e.user.name}","${e.user.email}","${e.project?.name ?? ''}","${desc}",${hours}`;
  });
  return [header, ...rows].join('\n');
}

export function getMockHtml(): string {
  const totalHours = (ENTRIES.reduce((s, e) => s + e.duration_seconds, 0) / 3600).toFixed(1);
  const rows = ENTRIES.map(e => {
    const date = new Date(e.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const hours = (e.duration_seconds / 3600).toFixed(2);
    return `<tr><td>${date}</td><td>${e.user.name}</td><td>${e.project?.name ?? '—'}</td><td>${e.description ?? '—'}</td><td>${hours}h</td></tr>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;font-size:12px;color:#333;padding:24px}
h1{font-size:20px;margin-bottom:4px}p{margin:0 0 16px;color:#666}
table{width:100%;border-collapse:collapse}
th{background:#111;color:#fff;padding:8px;text-align:left;font-size:11px}
td{padding:6px 8px;border-bottom:1px solid #eee}
tr:nth-child(even)td{background:#f9f9f9}.total{font-weight:bold;margin-top:16px}
</style></head><body>
<h1>Clockwork Time Report</h1><p>Demo export — ${new Date().toLocaleDateString()}</p>
<table><thead><tr><th>Date</th><th>User</th><th>Project</th><th>Description</th><th>Hours</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="total">Total: ${totalHours}h across ${ENTRIES.length} entries</p>
</body></html>`;
}
