const STORAGE_KEYS = {
  saved: 'savedJobs',
  hidden: 'hiddenJobs',
  legacyApplied: 'appliedJobs',
  stages: 'jobApplicationStages',
  filterView: 'savedFilterView',
  trackedJobs: 'trackedJobSnapshots'
};

const STAGES = [
  'Not started',
  'Saved',
  'Applying',
  'Applied',
  'OA / Assessment',
  'Interview',
  'Final Round',
  'Offer',
  'Rejected',
  'Withdrawn'
];

const state = {
  jobs: [],
  payload: {},
  universe: null,
  categories: new Set(),
  excludedCategories: new Set(),
  quick: new Set(),
  excludedQuick: new Set(),
  mainView: true,
  locations: new Set(),
  excludedLocations: new Set(),
  industries: new Set(),
  excludedIndustries: new Set(),
  tiers: new Set(),
  excludedTiers: new Set(),
  view: 'all',
  saved: new Set(readArray(STORAGE_KEYS.saved)),
  hidden: new Set(readArray(STORAGE_KEYS.hidden)),
  stages: readObject(STORAGE_KEYS.stages),
  trackedJobs: readObject(STORAGE_KEYS.trackedJobs),
  lastHiddenId: null,
};

const els = {
  jobs: document.querySelector('#jobs'),
  template: document.querySelector('#jobTemplate'),
  search: document.querySelector('#searchInput'),
  freshness: document.querySelector('#freshnessFilter'),
  sort: document.querySelector('#sortFilter'),
  stats: document.querySelector('#stats'),
  categoryNav: document.querySelector('#categoryNav'),
  quickFilters: document.querySelector('#quickFilters'),
  resultCount: document.querySelector('#resultCount'),
  feedTitle: document.querySelector('#feedTitle'),
  feedEyebrow: document.querySelector('#feedEyebrow'),
  refreshStamp: document.querySelector('#refreshStamp'),
  coverageStamp: document.querySelector('#coverageStamp'),
  empty: document.querySelector('#emptyState'),
  emptyMessage: document.querySelector('#emptyMessage'),
  locationOptions: document.querySelector('#locationOptions'),
  locationSummary: document.querySelector('#locationSummary'),
  industryOptions: document.querySelector('#industryOptions'),
  industrySummary: document.querySelector('#industrySummary'),
  tierOptions: document.querySelector('#tierOptions'),
  tierSummary: document.querySelector('#tierSummary'),
  resetFilters: document.querySelector('#resetFilters'),
  actionQueuePriorityCount: document.querySelector('#actionQueuePriorityCount'),
  salary: document.querySelector('#salaryFilter'),
  includeUnknownSalary: document.querySelector('#includeUnknownSalary'),
  saveFilterView: document.querySelector('#saveFilterView'),
  loadFilterView: document.querySelector('#loadFilterView'),
  toast: document.querySelector('#toast'),
  toastMessage: document.querySelector('#toastMessage'),
  toastUndo: document.querySelector('#toastUndo'),
};

const categories = [
  'Product',
  'Strategy & Operations',
  'Business & Analytics',
  'Consulting & Transformation',
  'Programs & Projects',
  'Innovation & AI',
  'GTM & Commercial',
  'Customer & Solutions',
  'Research & Insights',
  'Partnerships & Platforms',
  'Growth & Marketplace'
];

const quickFilters = [
  '🔥 Apply ASAP', 'Priority A', 'New Grad', 'Entry Level',
  'Associate', 'Analyst', 'Internship'
];


const CATEGORY_ALIASES = {
  'Product Management': 'Product',
  'Product': 'Product',
  'Strategy & Operations': 'Strategy & Operations',
  'Business & Analytics': 'Business & Analytics',
  'Consulting': 'Consulting & Transformation',
  'Consulting & Transformation': 'Consulting & Transformation',
  'Program Management': 'Programs & Projects',
  'Programs & Projects': 'Programs & Projects',
  'Innovation & AI': 'Innovation & AI',
  'Marketing & GTM': 'GTM & Commercial',
  'GTM & Commercial': 'GTM & Commercial',
  'Customer & Solutions': 'Customer & Solutions',
  'Research & Insights': 'Research & Insights',
  'Partnerships & BD': 'Partnerships & Platforms',
  'Partnerships & Platforms': 'Partnerships & Platforms',
  'Marketplace & Growth': 'Growth & Marketplace',
  'Growth & Marketplace': 'Growth & Marketplace'
};

function canonicalCategory(category='') {
  return CATEGORY_ALIASES[category] || category || 'Other';
}

const locationLabels = {
  usa: 'USA based',
  'new york': 'New York',
  california: 'California',
  remote: 'Remote',
  chicago: 'Chicago',
  boston: 'Boston',
  seattle: 'Seattle',
  austin: 'Austin',
  shanghai: 'Shanghai',
  london: 'London',
  canada: 'Canada',
};

const tierLabels = { A: 'Priority A', B: 'Priority B', C: 'Priority C' };

const US_STATE_NAMES = [
  'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho',
  'illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi',
  'missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio',
  'oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia',
  'washington','west virginia','wisconsin','wyoming','district of columbia'
];

const US_CITY_HINTS = [
  'new york','nyc','manhattan','brooklyn','san francisco','los angeles','mountain view','palo alto','san jose','sunnyvale','burbank',
  'santa monica','seattle','austin','chicago','boston','atlanta','miami','orlando','tampa','dallas','houston','denver','phoenix',
  'philadelphia','pittsburgh','washington dc','washington, dc','arlington','mclean','reston','raleigh','charlotte','nashville',
  'minneapolis','detroit','columbus','cincinnati','cleveland','portland','salt lake city','las vegas','san diego','irvine','bellevue',
  'redmond','menlo park','cupertino','bentonville','st. louis','st louis','jersey city','hoboken','stamford','hartford'
];

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function readSavedFilterView() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEYS.filterView) || 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function cycleFilterState(included, excluded, value) {
  if (included.has(value)) {
    included.delete(value);
    excluded.add(value);
    return 'excluded';
  }
  if (excluded.has(value)) {
    excluded.delete(value);
    return 'default';
  }
  included.add(value);
  return 'included';
}

function clearTriState(included, excluded) {
  included.clear();
  excluded.clear();
}

function filterStateClass(included, excluded, value) {
  if (excluded.has(value)) return 'excluded';
  if (included.has(value)) return 'active';
  return '';
}

function passesTriState(value, included, excluded) {
  if (excluded.has(value)) return false;
  return included.size === 0 || included.has(value);
}

function migrateLegacyAppliedState() {
  const legacyApplied = readArray(STORAGE_KEYS.legacyApplied);
  let changed = false;

  legacyApplied.forEach(id => {
    if (!state.stages[id]) {
      state.stages[id] = 'Applied';
      changed = true;
    }
  });

  state.saved.forEach(id => {
    if (!state.stages[id]) {
      state.stages[id] = 'Saved';
      changed = true;
    }
  });

  if (changed) saveState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([...state.saved]));
  localStorage.setItem(STORAGE_KEYS.hidden, JSON.stringify([...state.hidden]));
  localStorage.setItem(STORAGE_KEYS.stages, JSON.stringify(state.stages));
  localStorage.setItem(STORAGE_KEYS.trackedJobs, JSON.stringify(state.trackedJobs));
}

function shouldRetainJob(id) {
  return state.saved.has(id) || Boolean(state.stages[id] && state.stages[id] !== 'Not started');
}

function trackJobSnapshot(id) {
  const job = state.jobs.find(item => item.id === id);
  if (job) state.trackedJobs[id] = { ...job };
}

function syncTrackedJobSnapshots(jobs) {
  const jobsById = new Map(jobs.map(job => [job.id, job]));
  const retainedIds = new Set([...state.saved, ...Object.keys(state.stages)]);

  retainedIds.forEach(id => {
    if (!shouldRetainJob(id)) return;
    const job = jobsById.get(id);
    if (job) state.trackedJobs[id] = { ...job };
  });

  Object.keys(state.trackedJobs).forEach(id => {
    if (!shouldRetainJob(id)) delete state.trackedJobs[id];
  });
}

function isWithinLiveWindow(job) {
  if (!job.postedAt) return true;
  const posted = new Date(job.postedAt).getTime();
  if (!Number.isFinite(posted)) return true;
  return ageInDays(job.postedAt) <= 7;
}

function applyJobRetention(jobs) {
  syncTrackedJobSnapshots(jobs);
  const retained = jobs.filter(job => isWithinLiveWindow(job) || shouldRetainJob(job.id));
  const ids = new Set(retained.map(job => job.id));

  Object.entries(state.trackedJobs).forEach(([id, job]) => {
    if (shouldRetainJob(id) && !ids.has(id)) retained.push({ ...job, retainedByStatus: true });
  });

  return retained;
}

function ageInDays(dateString) {
  if (!dateString) return Infinity;
  const age = (Date.now() - new Date(dateString).getTime()) / 86400000;
  return Number.isFinite(age) ? Math.max(0, age) : Infinity;
}

function ageLabel(dateString) {
  const days = ageInDays(dateString);
  if (!Number.isFinite(days)) return 'DATE UNKNOWN';
  if (days < 1) return `${Math.floor(days * 24)}H AGO`;
  if (days < 2) return '1D AGO';
  return `${Math.floor(days)}D AGO`;
}

function freshnessBucket(job) {
  const hours = ageInDays(job.postedAt) * 24;
  if (hours < 6) return '< 6 hours';
  if (hours < 12) return '6–12 hours';
  if (hours <= 24) return '12–24 hours';
  return 'Older';
}

function getStage(id) {
  return state.stages[id] || (state.saved.has(id) ? 'Saved' : 'Not started');
}

function setStage(id, stage) {
  if (stage === 'Not started') {
    delete state.stages[id];
    state.saved.delete(id);
    delete state.trackedJobs[id];
  } else {
    state.stages[id] = stage;
    if (stage === 'Saved') state.saved.add(id);
    if (stage !== 'Saved' && state.saved.has(id)) {
      // Keep the star as an independent bookmark unless explicitly unsaved.
    }
    trackJobSnapshot(id);
  }
  saveState();
}

function isActiveApplication(stage) {
  return ['Applying','Applied','OA / Assessment','Interview','Final Round','Offer'].includes(stage);
}

function isUsaLocation(location) {
  const original = location || '';
  const loc = original.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!loc) return false;
  if (/\bunited states\b|\busa\b|\bu\.s\.a\.?\b|\bunited states of america\b/.test(loc)) return true;
  if (/\bremote\b.*\b(us|u\.s\.|usa|united states)\b|\b(us|u\.s\.|usa)\b.*\bremote\b/.test(loc)) return true;
  if (/,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i.test(original)) return true;
  if (US_STATE_NAMES.some(stateName => loc.includes(stateName))) return true;
  if (US_CITY_HINTS.some(city => loc.includes(city))) return true;
  return false;
}

function locationMatchesValue(location, value) {
  const loc = (location || '').toLowerCase();
  if (value === 'usa') return isUsaLocation(location);
  if (value === 'new york') return /new york|nyc|manhattan|brooklyn/.test(loc);
  if (value === 'california') return /california|san francisco|los angeles|mountain view|palo alto|san jose|bay area|sunnyvale|burbank|santa monica|san diego|irvine|cupertino|menlo park/.test(loc);
  if (value === 'canada') return /canada|toronto|vancouver|montreal/.test(loc);
  if (value === 'remote') return /remote|work from home|virtual/.test(loc);
  return loc.includes(value);
}

function locationMatches(location) {
  if ([...state.excludedLocations].some(value => locationMatchesValue(location, value))) return false;
  if (state.locations.size === 0) return true;
  return [...state.locations].some(value => locationMatchesValue(location, value));
}

function isInternshipJob(job) {
  // Titles and employment type are authoritative. Generated tags may mention
  // internships only because the full job description references them.
  const text = `${job.title || ''} ${job.employmentType || ''}`.toLowerCase();
  return /\bintern(?:ship)?\b|\bco-?op\b/.test(text);
}

function quickMatchesOne(job, item) {
  const hay = `${job.title} ${job.location} ${job.employmentType || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  if (item === '🔥 Apply ASAP') {
    const breakdown = job.scoreBreakdown || {};
    return ageInDays(job.postedAt) <= 1
      && (job.matchScore || 0) >= 85
      && (breakdown.roleFit ?? 85) >= 85
      && (breakdown.careerFit ?? 70) >= 70;
  }
  if (item === 'Priority A') return job.companyTier === 'A';
  if (item === 'New Grad') {
    const newGrad = /new grad|new graduate|new college grad|college graduate|university graduate|graduate program|graduate product|\b2027 start\b|class of 2027/.test(hay);
    return newGrad && !isInternshipJob(job);
  }
  if (item === 'Internship') return isInternshipJob(job);
  return hay.includes(item.toLowerCase());
}

function mainViewMatches(job) {
  if (!state.mainView) return true;
  return locationMatchesValue(job.location, 'usa') && quickMatchesOne(job, '🔥 Apply ASAP');
}

function quickMatches(job) {
  // Included filters narrow together. Any excluded match removes the job.
  if ([...state.excludedQuick].some(item => quickMatchesOne(job, item))) return false;
  return [...state.quick].every(item => quickMatchesOne(job, item));
}

function visibleInCurrentView(job) {
  const stage = getStage(job.id);

  if (state.view === 'hidden') return state.hidden.has(job.id);
  if (state.hidden.has(job.id)) return false;

  if (state.view === 'today' && ageInDays(job.postedAt) > 1) return false;
  if (state.view === 'saved' && !state.saved.has(job.id) && stage !== 'Saved') return false;
  if (state.view === 'pipeline' && !isActiveApplication(stage) && !['Rejected','Withdrawn'].includes(stage)) return false;

  return true;
}

function salaryMatches(job) {
  const threshold = els.salary?.value || 'all';
  if (threshold === 'all') return true;

  const minRequired = Number(threshold);
  const known = Boolean(job.salaryKnown) && Number.isFinite(Number(job.salaryMin));

  if (!known) return Boolean(els.includeUnknownSalary?.checked);
  return Number(job.salaryMin) >= minRequired;
}

function formatSalary(job) {
  if (!job.salaryKnown || !Number.isFinite(Number(job.salaryMin))) return '';
  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);
  const compact = n => `$${Math.round(n / 1000)}K`;
  if (Number.isFinite(max) && max > min) return `${compact(min)}–${compact(max)} base`;
  return `${compact(min)}+ base`;
}

function filteredJobs() {
  const query = els.search.value.trim().toLowerCase();
  const freshness = els.freshness.value;

  let list = state.jobs.filter(job => {
    if (!visibleInCurrentView(job)) return false;
    if (!passesTriState(job.category, state.categories, state.excludedCategories)) return false;
    if (!mainViewMatches(job)) return false;
    if (!quickMatches(job)) return false;
    if (!locationMatches(job.location)) return false;
    if (!salaryMatches(job)) return false;
    if (!passesTriState(job.industry || 'Other', state.industries, state.excludedIndustries)) return false;
    if (!passesTriState(job.companyTier || 'C', state.tiers, state.excludedTiers)) return false;

    if (state.view !== 'today' && freshness !== 'all' && ageInDays(job.postedAt) > Number(freshness)) return false;

    if (query) {
      const hay = `${job.title} ${job.company} ${job.location} ${job.category} ${job.industry || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  if (state.view === 'today' || els.sort.value === 'newest') {
    list.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
  } else if (els.sort.value === 'recommended') {
    list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0) || new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
  } else {
    list.sort((a, b) => a.company.localeCompare(b.company));
  }

  return list;
}

function renderNav() {
  els.categoryNav.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = state.categories.size === 0 && state.excludedCategories.size === 0 ? 'active' : '';
  allBtn.innerHTML = `<span>All</span><span class="count">${state.jobs.length}</span>`;
  allBtn.onclick = () => {
    state.mainView = false;
    clearTriState(state.categories, state.excludedCategories);
    render();
  };
  els.categoryNav.appendChild(allBtn);

  categories.forEach(category => {
    const btn = document.createElement('button');
    const count = state.jobs.filter(j => j.category === category).length;
    btn.className = filterStateClass(state.categories, state.excludedCategories, category);
    btn.title = 'Click once to include, twice to exclude, three times to reset';
    btn.innerHTML = `<span>${category}</span><span class="nav-meta"><span class="count">${count}</span><span class="exclude-mark" aria-hidden="true">×</span></span>`;
    btn.onclick = () => {
      state.mainView = false;
      cycleFilterState(state.categories, state.excludedCategories, category);
      render();
    };
    els.categoryNav.appendChild(btn);
  });
}

function renderQuickFilters() {
  els.quickFilters.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `chip ${!state.mainView && state.quick.size === 0 && state.excludedQuick.size === 0 ? 'active' : ''}`;
  allBtn.textContent = 'All';
  allBtn.onclick = () => {
    state.mainView = false;
    clearTriState(state.quick, state.excludedQuick);
    render();
  };
  els.quickFilters.appendChild(allBtn);

  const mainBtn = document.createElement('button');
  mainBtn.className = `chip ${state.mainView ? 'active' : ''}`;
  mainBtn.textContent = 'Main View';
  mainBtn.title = 'USA-based roles that meet Apply ASAP criteria';
  mainBtn.onclick = () => {
    state.mainView = true;
    clearTriState(state.quick, state.excludedQuick);
    clearTriState(state.locations, state.excludedLocations);
    render();
  };
  els.quickFilters.appendChild(mainBtn);

  quickFilters.forEach(item => {
    const btn = document.createElement('button');
    const filterClass = !state.mainView ? filterStateClass(state.quick, state.excludedQuick, item) : '';
    btn.className = `chip ${filterClass}`;
    btn.title = 'Click once to include, twice to exclude, three times to reset';
    btn.innerHTML = `<span>${escapeHtml(item)}</span><span class="exclude-mark" aria-hidden="true">×</span>`;
    btn.onclick = () => {
      state.mainView = false;
      cycleFilterState(state.quick, state.excludedQuick, item);
      render();
    };
    els.quickFilters.appendChild(btn);
  });
}

function renderStats() {
  const day = state.jobs.filter(j => !state.hidden.has(j.id) && ageInDays(j.postedAt) <= 1).length;
  const asap = state.jobs.filter(j => !state.hidden.has(j.id) && (j.matchScore || 0) >= 85 && ageInDays(j.postedAt) <= 3).length;
  const healthy = state.payload.successfulSources ?? 0;
  const totalSources = state.payload.sourceCount ?? 0;
  const applied = Object.values(state.stages).filter(s => isActiveApplication(s)).length;

  const stats = [
    [state.jobs.length, 'Matching jobs'],
    [day, 'Posted ≤24h'],
    [asap, 'Apply ASAP'],
    [totalSources ? `${healthy}/${totalSources}` : '—', 'Sources live'],
    [state.saved.size, 'Saved'],
    [applied, 'Applications']
  ];

  els.stats.innerHTML = stats
    .map(([n, label]) => `<div class="stat"><strong>${n}</strong><span>${label}</span></div>`)
    .join('');
}

function priorityActionCount() {
  return state.jobs.filter(job =>
    !state.hidden.has(job.id) &&
    ageInDays(job.postedAt) <= 1 &&
    ((job.matchScore || 0) >= 85 || job.companyTier === 'A')
  ).length;
}

function renderActionQueue() {
  if (els.actionQueuePriorityCount) els.actionQueuePriorityCount.textContent = priorityActionCount();
}

function initials(company) {
  return company.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
}

function priorityLabel(job) {
  const score = job.matchScore || 0;
  if (score >= 90 && ageInDays(job.postedAt) <= 3) return '🔥 APPLY ASAP';
  if (score >= 85) return 'STRONG FIT';
  if (score >= 75) return 'GOOD FIT';
  return 'CONSIDER';
}

function scoreTooltip(job) {
  const b = job.scoreBreakdown;
  if (!b) return 'Heuristic fit score';
  return `Role ${b.roleFit} · Experience ${b.experienceFit} · Company ${b.companyFit} · Early-career ${b.careerFit} · Freshness ${b.freshness}`;
}

function stageClass(stage) {
  return `stage-${stage.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function renderStageSelect(select, jobId) {
  select.innerHTML = '';
  const current = getStage(jobId);

  STAGES.forEach(stage => {
    const option = document.createElement('option');
    option.value = stage;
    option.textContent = stage;
    option.selected = stage === current;
    select.appendChild(option);
  });

  select.className = `stage-select ${stageClass(current)}`;
  select.addEventListener('change', () => {
    const next = select.value;
    setStage(jobId, next);
    select.className = `stage-select ${stageClass(next)}`;
    render();
  });
}

function addFreshnessGroup(label, count) {
  const heading = document.createElement('div');
  heading.className = 'freshness-group';
  heading.innerHTML = `<strong>${label}</strong><span>${count} role${count === 1 ? '' : 's'}</span><div class="freshness-line"></div>`;
  els.jobs.appendChild(heading);
}

function createJobNode(job) {
  const node = els.template.content.cloneNode(true);
  const card = node.querySelector('.job-card');

  node.querySelector('.company-mark').textContent = initials(job.company);
  node.querySelector('.company').textContent = job.company;
  node.querySelector('.title').textContent = job.title;
  node.querySelector('.meta').textContent = [job.location, job.employmentType].filter(Boolean).join(' · ');
  const salaryText = formatSalary(job);
  if (salaryText) {
    const salary = document.createElement('div');
    salary.className = 'salary-display';
    salary.textContent = salaryText;
    node.querySelector('.meta').insertAdjacentElement('afterend', salary);
  }

  const age = node.querySelector('.age');
  age.textContent = ageLabel(job.postedAt);
  if (ageInDays(job.postedAt) <= 1) age.classList.add('new');

  node.querySelector('.source').textContent = job.source || 'CAREERS';

  const tier = node.querySelector('.tier');
  tier.textContent = `TIER ${job.companyTier || 'C'}`;
  tier.classList.add(`tier-${(job.companyTier || 'C').toLowerCase()}`);

  const match = node.querySelector('.match');
  match.textContent = `${job.matchScore || 0}%`;
  match.title = scoreTooltip(job);
  node.querySelector('.priority-text').textContent = priorityLabel(job);

  const tags = [job.category, job.industry, ...(job.tags || []).slice(0, 3)].filter(Boolean);
  node.querySelector('.tags').innerHTML = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  const save = node.querySelector('.save');
  const isSaved = state.saved.has(job.id);
  save.textContent = isSaved ? '★ Saved' : '☆ Save';
  save.classList.toggle('active', isSaved);
  save.onclick = () => {
    if (state.saved.has(job.id)) {
      state.saved.delete(job.id);
      if (state.stages[job.id] === 'Saved') delete state.stages[job.id];
      if (!shouldRetainJob(job.id)) delete state.trackedJobs[job.id];
    } else {
      state.saved.add(job.id);
      if (!state.stages[job.id]) state.stages[job.id] = 'Saved';
      trackJobSnapshot(job.id);
    }
    saveState();
    render();
  };

  const hide = node.querySelector('.hide-job');
  if (state.view === 'hidden') {
    hide.textContent = 'Restore';
    hide.classList.add('restore');
    hide.title = 'Restore job to feed';
    hide.onclick = () => {
      state.hidden.delete(job.id);
      saveState();
      showToast('Job restored.', null);
      render();
    };
  } else {
    hide.textContent = 'Hide';
    hide.title = 'Hide job';
    hide.onclick = () => {
      state.hidden.add(job.id);
      state.lastHiddenId = job.id;
      saveState();
      showToast('Job hidden.', () => {
        state.hidden.delete(job.id);
        state.lastHiddenId = null;
        saveState();
        render();
      });
      render();
    };
  }

  const apply = node.querySelector('.apply-btn');
  apply.href = job.url;

  renderStageSelect(node.querySelector('.stage-select'), job.id);

  card.dataset.id = job.id;
  return node;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function renderJobs() {
  const jobs = filteredJobs();
  els.jobs.innerHTML = '';
  els.empty.classList.toggle('hidden', jobs.length !== 0);
  els.resultCount.textContent = `${jobs.length} role${jobs.length === 1 ? '' : 's'}`;

  if (state.mainView && state.view === 'all') {
    els.feedEyebrow.textContent = 'MAIN VIEW · USA · APPLY ASAP';
    els.feedTitle.textContent = 'Main View';
    els.emptyMessage.textContent = 'No USA-based roles currently meet the Apply ASAP criteria. Switch to All to browse the full feed.';
  } else if (state.view === 'today') {
    els.feedEyebrow.textContent = 'NEW TODAY · APPLY EARLY';
    els.feedTitle.textContent = 'Roles posted in the past 24 hours';
    els.emptyMessage.textContent = 'No roles were posted in the past 24 hours with these filters. Try widening your role or location filters.';
  } else if (state.view === 'saved') {
    els.feedEyebrow.textContent = 'SAVED ROLES';
    els.feedTitle.textContent = 'Saved jobs';
    els.emptyMessage.textContent = 'No saved roles match these filters.';
  } else if (state.view === 'pipeline') {
    els.feedEyebrow.textContent = 'APPLICATION PIPELINE';
    els.feedTitle.textContent = 'Applications';
    els.emptyMessage.textContent = 'No applications match these filters yet. Change a job status to Applying or beyond to add it here.';
  } else if (state.view === 'hidden') {
    els.feedEyebrow.textContent = 'HIDDEN ROLES';
    els.feedTitle.textContent = 'Hidden jobs';
    els.emptyMessage.textContent = 'No hidden roles match these filters.';
  } else if (state.categories.size === 0 && state.excludedCategories.size === 0) {
    els.feedEyebrow.textContent = 'LIVE FEED · REFRESHES EVERY 3 HOURS';
    els.feedTitle.textContent = 'All matching jobs';
    els.emptyMessage.textContent = 'Try widening freshness, industry, company tier, or location.';
  } else if (state.categories.size === 0) {
    els.feedEyebrow.textContent = 'LIVE FEED · REFRESHES EVERY 3 HOURS';
    els.feedTitle.textContent = `${state.excludedCategories.size} ${state.excludedCategories.size === 1 ? 'category' : 'categories'} excluded`;
  } else if (state.categories.size <= 2) {
    els.feedEyebrow.textContent = 'LIVE FEED · REFRESHES EVERY 3 HOURS';
    els.feedTitle.textContent = [...state.categories].join(' + ');
  } else {
    els.feedEyebrow.textContent = 'LIVE FEED · REFRESHES EVERY 3 HOURS';
    els.feedTitle.textContent = `${state.categories.size} categories selected`;
  }

  if (state.view === 'today') {
    const buckets = ['< 6 hours', '6–12 hours', '12–24 hours'];
    buckets.forEach(bucket => {
      const bucketJobs = jobs.filter(job => freshnessBucket(job) === bucket);
      if (!bucketJobs.length) return;
      addFreshnessGroup(bucket, bucketJobs.length);
      bucketJobs.forEach(job => els.jobs.appendChild(createJobNode(job)));
    });
  } else {
    jobs.forEach(job => els.jobs.appendChild(createJobNode(job)));
  }
}

function summaryText(included, excluded, labels, fallback) {
  if (included.size === 0 && excluded.size === 0) return fallback;
  const includedNames = [...included].map(value => labels?.[value] || value);
  const excludedNames = [...excluded].map(value => labels?.[value] || value);
  const parts = [];

  if (includedNames.length === 1) parts.push(includedNames[0]);
  else if (includedNames.length) parts.push(`${includedNames.length} included`);

  if (excludedNames.length === 1) parts.push(`not ${excludedNames[0]}`);
  else if (excludedNames.length) parts.push(`${excludedNames.length} excluded`);

  return parts.join(' · ');
}

function syncMultiSelectSummaries() {
  els.locationSummary.textContent = summaryText(state.locations, state.excludedLocations, locationLabels, 'All locations');
  els.industrySummary.textContent = summaryText(state.industries, state.excludedIndustries, null, 'All industries');
  els.tierSummary.textContent = summaryText(state.tiers, state.excludedTiers, tierLabels, 'All company tiers');
}

function syncMultiSelectOptions(container, included, excluded) {
  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = included.has(input.value);
    input.indeterminate = excluded.has(input.value);
    input.closest('.multi-option')?.classList.toggle('excluded', excluded.has(input.value));
  });
}

function bindTriStateMultiSelect(container, included, excluded) {
  container.querySelectorAll('.multi-option').forEach(label => {
    const input = label.querySelector('input[type="checkbox"]');
    if (!input) return;

    if (!label.querySelector('.filter-x')) {
      const mark = document.createElement('span');
      mark.className = 'filter-x';
      mark.textContent = '×';
      mark.setAttribute('aria-hidden', 'true');
      label.appendChild(mark);
    }

    label.title = 'Click once to include, twice to exclude, three times to reset';
    input.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      state.mainView = false;
      cycleFilterState(included, excluded, input.value);
      render();
    });
  });

  syncMultiSelectOptions(container, included, excluded);
}

function populateIndustryOptions() {
  const industries = [...new Set(state.jobs.map(j => j.industry || 'Other').filter(Boolean))].sort();
  state.industries = new Set([...state.industries].filter(x => industries.includes(x)));
  state.excludedIndustries = new Set([...state.excludedIndustries].filter(x => industries.includes(x)));
  els.industryOptions.innerHTML = '';

  industries.forEach(industry => {
    const label = document.createElement('label');
    label.className = 'multi-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = industry;

    const span = document.createElement('span');
    span.textContent = industry;
    label.append(input, span);
    els.industryOptions.appendChild(label);
  });

  bindTriStateMultiSelect(els.industryOptions, state.industries, state.excludedIndustries);
}

function renderCoverage() {
  const universeCount = state.universe?.count || 0;
  // Show the counts that actually generated the current jobs.json, not aspirational config counts.
  const direct = state.payload.directSourceCount ?? state.payload.sourceCount ?? 0;
  const community = state.payload.communityFeedCount ?? 0;
  const failures = state.payload.failedSources || 0;
  const parts = [];

  if (direct) parts.push(`${direct} direct ATS sources used`);
  if (community) parts.push(`${community} broad early-career feeds used`);
  if (universeCount) parts.push(`${universeCount} companies tracked`);
  if (failures) parts.push(`${failures} source failures this run`);

  els.coverageStamp.textContent = parts.join(' · ');
}

function syncViewButtons() {
  const map = {
    today: '#showTodayBtn',
    saved: '#showSavedBtn',
    pipeline: '#showPipelineBtn',
    hidden: '#showHiddenBtn'
  };

  Object.entries(map).forEach(([view, selector]) => {
    document.querySelector(selector).classList.toggle('active', state.view === view);
  });
}

function render() {
  renderNav();
  renderQuickFilters();
  renderActionQueue();
  renderStats();
  renderJobs();
  renderCoverage();
  syncMultiSelectSummaries();
  syncMultiSelectOptions(els.locationOptions, state.locations, state.excludedLocations);
  syncMultiSelectOptions(els.industryOptions, state.industries, state.excludedIndustries);
  syncMultiSelectOptions(els.tierOptions, state.tiers, state.excludedTiers);
  syncViewButtons();
  if (els.saveFilterView) els.saveFilterView.textContent = `Save view (${filterChoiceCount()})`;
  if (els.loadFilterView) els.loadFilterView.disabled = !readSavedFilterView();
}

function resetFilters() {
  state.mainView = true;
  clearTriState(state.categories, state.excludedCategories);
  clearTriState(state.quick, state.excludedQuick);
  clearTriState(state.locations, state.excludedLocations);
  clearTriState(state.industries, state.excludedIndustries);
  clearTriState(state.tiers, state.excludedTiers);
  els.search.value = '';
  els.freshness.value = 'all';
  els.sort.value = 'newest';
  if (els.salary) els.salary.value = 'all';
  if (els.includeUnknownSalary) els.includeUnknownSalary.checked = true;

  document.querySelectorAll('.multi-menu input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });

  render();
}

function serializeFilterView() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    mainView: state.mainView,
    categories: [...state.categories],
    excludedCategories: [...state.excludedCategories],
    quick: [...state.quick],
    excludedQuick: [...state.excludedQuick],
    locations: [...state.locations],
    excludedLocations: [...state.excludedLocations],
    industries: [...state.industries],
    excludedIndustries: [...state.excludedIndustries],
    tiers: [...state.tiers],
    excludedTiers: [...state.excludedTiers],
    search: els.search.value,
    freshness: els.freshness.value,
    salary: els.salary?.value || 'all',
    includeUnknownSalary: Boolean(els.includeUnknownSalary?.checked),
    sort: els.sort.value
  };
}

function filterChoiceCount(view = serializeFilterView()) {
  return [
    ...view.categories, ...view.excludedCategories,
    ...view.quick, ...view.excludedQuick,
    ...view.locations, ...view.excludedLocations,
    ...view.industries, ...view.excludedIndustries,
    ...view.tiers, ...view.excludedTiers
  ].length + (view.search ? 1 : 0);
}

function restoreSet(target, value) {
  target.clear();
  if (Array.isArray(value)) value.forEach(item => target.add(item));
}

function applyFilterView(view) {
  state.mainView = Boolean(view.mainView);
  state.view = 'all';
  restoreSet(state.categories, view.categories);
  restoreSet(state.excludedCategories, view.excludedCategories);
  restoreSet(state.quick, view.quick);
  restoreSet(state.excludedQuick, view.excludedQuick);
  restoreSet(state.locations, view.locations);
  restoreSet(state.excludedLocations, view.excludedLocations);
  restoreSet(state.industries, view.industries);
  restoreSet(state.excludedIndustries, view.excludedIndustries);
  restoreSet(state.tiers, view.tiers);
  restoreSet(state.excludedTiers, view.excludedTiers);
  els.search.value = typeof view.search === 'string' ? view.search : '';
  els.freshness.value = view.freshness || 'all';
  if (els.salary) els.salary.value = view.salary || 'all';
  if (els.includeUnknownSalary) els.includeUnknownSalary.checked = view.includeUnknownSalary !== false;
  els.sort.value = view.sort || 'newest';
  render();
}

function saveCurrentFilterView() {
  const view = serializeFilterView();
  localStorage.setItem(STORAGE_KEYS.filterView, JSON.stringify(view));
  render();
  const choiceCount = filterChoiceCount(view);
  showToast(`Filter view saved (${choiceCount} active ${choiceCount === 1 ? 'filter' : 'filters'}).`, null);
}

function loadSavedFilterView() {
  const view = readSavedFilterView();
  if (!view) {
    showToast('No saved filter view yet.', null);
    return;
  }
  applyFilterView(view);
  showToast('Saved filter view loaded.', null);
}

function setView(view) {
  state.mainView = false;
  state.view = state.view === view ? 'all' : view;
  if (state.view === 'today') {
    els.freshness.value = 'all';
    els.sort.value = 'newest';
  }
  render();
}

let toastTimer;
function showToast(message, undoAction) {
  clearTimeout(toastTimer);
  els.toastMessage.textContent = message;
  els.toastUndo.classList.toggle('hidden', !undoAction);
  els.toastUndo.onclick = () => {
    if (undoAction) undoAction();
    els.toast.classList.remove('show');
  };
  els.toast.classList.add('show');

  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 4500);
}

function exportLocalData() {
  const data = {
    version: 4,
    exportedAt: new Date().toISOString(),
    savedJobs: [...state.saved],
    hiddenJobs: [...state.hidden],
    applicationStages: state.stages,
    trackedJobs: state.trackedJobs,
    savedFilterView: readSavedFilterView()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'job-recruiting-dashboard-local-data.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importLocalData(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object') throw new Error('Invalid file');

      state.saved = new Set(Array.isArray(data.savedJobs) ? data.savedJobs : []);
      state.hidden = new Set(Array.isArray(data.hiddenJobs) ? data.hiddenJobs : []);
      state.stages = data.applicationStages && typeof data.applicationStages === 'object'
        ? data.applicationStages
        : {};
      state.trackedJobs = data.trackedJobs && typeof data.trackedJobs === 'object' && !Array.isArray(data.trackedJobs)
        ? data.trackedJobs
        : {};
      if (data.savedFilterView && typeof data.savedFilterView === 'object') {
        localStorage.setItem(STORAGE_KEYS.filterView, JSON.stringify(data.savedFilterView));
      }

      state.jobs = applyJobRetention(state.jobs);
      saveState();
      render();
      showToast('Local recruiting data imported.', null);
    } catch (error) {
      console.error(error);
      showToast('Could not import that file.', null);
    }
  };

  reader.readAsText(file);
}

async function loadData() {
  try {
    const [jobRes, universeRes] = await Promise.all([
      fetch(`data/jobs.json?ts=${Date.now()}`),
      fetch(`config/company-universe.json?ts=${Date.now()}`).catch(() => null)
    ]);

    if (!jobRes.ok) throw new Error('Could not load jobs.json');

    const payload = await jobRes.json();
    state.payload = payload;
    const fetchedJobs = (payload.jobs || []).map(job => ({ ...job, category: canonicalCategory(job.category) }));
    state.jobs = applyJobRetention(fetchedJobs);
    saveState();

    if (universeRes?.ok) state.universe = await universeRes.json();

    els.refreshStamp.textContent = payload.generatedAt
      ? `Updated ${new Date(payload.generatedAt).toLocaleString()}`
      : 'Updated automatically';

    populateIndustryOptions();
    bindTriStateMultiSelect(els.locationOptions, state.locations, state.excludedLocations);
    bindTriStateMultiSelect(els.tierOptions, state.tiers, state.excludedTiers);
    migrateLegacyAppliedState();
    render();
  } catch (err) {
    console.error(err);
    els.refreshStamp.textContent = 'Could not load job feed';
  }
}

els.search.addEventListener('input', render);
els.freshness.addEventListener('change', render);
els.sort.addEventListener('change', render);
if (els.salary) els.salary.addEventListener('change', render);
if (els.includeUnknownSalary) els.includeUnknownSalary.addEventListener('change', render);
els.resetFilters.addEventListener('click', resetFilters);
if (els.saveFilterView) els.saveFilterView.addEventListener('click', saveCurrentFilterView);
if (els.loadFilterView) els.loadFilterView.addEventListener('click', loadSavedFilterView);

document.querySelector('#showTodayBtn').onclick = () => setView('today');
document.querySelector('#showSavedBtn').onclick = () => setView('saved');
document.querySelector('#showPipelineBtn').onclick = () => setView('pipeline');
document.querySelector('#showHiddenBtn').onclick = () => setView('hidden');

document.querySelector('#exportBtn').onclick = exportLocalData;

document.querySelector('#importInput').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  importLocalData(file);
  event.target.value = '';
});

document.addEventListener('click', event => {
  document.querySelectorAll('.multi-select[open]').forEach(details => {
    if (!details.contains(event.target)) details.removeAttribute('open');
  });
});

loadData();
