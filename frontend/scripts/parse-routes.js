const fs = require('fs');
const content = fs.readFileSync('client/src/App.jsx', 'utf8');

const lines = content.split('\n');
const routes = [];
let parentPath = '';   // tracks the current nested route parent path

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Detect opening of nested layout (e.g., /pharmacy-business or /lab-business)
  const openLayout = line.match(/<Route\s+path=["']([^"']*)["'].*element=\{?<(\w+Layout)/);
  if (openLayout) {
    parentPath = openLayout[1];
    continue; // don't record the layout route itself as a page
  }

  // Detect closing of nested layout (the </Route> that matches)
  // We use a simple heuristic: if we see a standalone </Route> and we're inside a nested section
  // Track nesting via the element content
  if (line === '</Route>' && parentPath) {
    parentPath = '';
    continue;
  }

  const routeMatch = line.match(/<Route\s+path=["']([^"']*)["']/);
  if (!routeMatch) continue;

  let path = routeMatch[1];
  const fullLine = lines[i].trim();

  // Resolve relative path against parent
  if (parentPath && path && !path.startsWith('/')) {
    path = parentPath + '/' + path;
  }

  let component = '';
  let roles = [];
  let authType = 'public';
  let rendering = 'SSR';
  let section = 'other';
  let nextTarget = '';

  // Determine section and auth from path patterns
  const isPublicListing = path.match(/^\/(hospitals|hospital-doctors|clinic-doctors|clinic\/:clinicId|book-test|diagnostic-centers|all-tests|lab\/:clinicId|technician|imaging|buy-medicine|cart|checkout|order-confirmation|order-tracking|payment-gateway)/);
  const isAuthPage = ['/login', '/signup', '/join-platform', '/forgot-password', '/verify-otp', '/pending-approval', '/doctor-setup', '/register/delivery-partner'].includes(path);
  const isPharmacy = path.startsWith('/pharmacy-business/');
  const isLab = path.startsWith('/lab-business/');
  const isSuperAdmin = path.startsWith('/superadmin/');
  const isAdmin = path.startsWith('/admin/');
  const isPatient = path.startsWith('/patient/');
  const isDoctor = path.startsWith('/doctor/');
  const isClinic = path.startsWith('/clinic/');
  const isDelivery = path.startsWith('/delivery/');

  // Special: redirect routes show Navigate
  if (/Navigate/.test(fullLine)) {
    const navMatch = fullLine.match(/to=["']([^"']*)["']/);
    component = 'Navigate->' + (navMatch ? navMatch[1] : '?') + ' (redirect)';
    authType = 'public';
    rendering = 'SSR';
    nextTarget = '(' + parentPath.replace(/^\//, '') + ')/' || isSuperAdmin ? '(dashboard)/superadmin/' :
                 isPharmacy ? '(dashboard)/pharmacy/' :
                 isLab ? '(dashboard)/labcenter/' :
                 isPublicListing ? '(public)/' :
                 isAuthPage ? '(public)/' : '(dashboard)/';
  }

  if (isAuthPage) {
    section = 'auth-pages';
    authType = 'public';
    rendering = 'SSR';
    nextTarget = '(public)/';
  } else if (path === '/' || path === '*') {
    section = path === '*' ? 'other' : 'public-listings';
    authType = 'public';
    rendering = 'SSR';
    nextTarget = '(public)/';
  } else if (isPublicListing) {
    section = 'public-listings';
    authType = 'public';
    rendering = 'SSR';
    nextTarget = '(public)/';
  } else if (isPharmacy) {
    section = 'pharmacy-business';
    authType = 'role';
    roles = ['pharmacy_owner'];
    rendering = 'CSR';
    nextTarget = '(dashboard)/pharmacy/';
  } else if (isLab) {
    section = 'lab-business';
    authType = 'role';
    roles = ['lab_owner'];
    rendering = 'CSR';
    nextTarget = '(dashboard)/labcenter/';
  } else if (isSuperAdmin) {
    section = 'superadmin';
    authType = 'role';
    roles = ['superadmin'];
    rendering = 'CSR';
    nextTarget = '(dashboard)/superadmin/';
  } else if (isAdmin) {
    section = 'admin';
    authType = 'role';
    const roleMatch = fullLine.match(/allowedRoles=\{([^}]+)\}/);
    if (roleMatch) {
      roles = roleMatch[1].split(',').map(r => r.trim().replace(/'/g, '').replace(/"/g, '')).filter(Boolean);
    } else {
      roles = ['hospital_admin'];
    }
    rendering = 'CSR';
    nextTarget = '(dashboard)/admin/';
  } else if (isPatient) {
    section = 'patient';
    authType = 'role';
    roles = ['patient'];
    rendering = 'CSR';
    nextTarget = '(dashboard)/patient/';
  } else if (isDoctor) {
    section = 'doctor';
    authType = 'role';
    roles = ['doctor'];
    rendering = 'CSR';
    nextTarget = '(dashboard)/doctor/';
  } else if (isClinic) {
    section = 'clinic';
    authType = 'role';
    roles = ['clinic_doctor'];
    rendering = 'CSR';
    nextTarget = '(dashboard)/clinic/';
  } else if (isDelivery) {
    section = 'delivery';
    authType = 'role';
    roles = ['delivery_boy'];
    rendering = 'CSR';
    nextTarget = '(dashboard)/delivery/';
  } else {
    section = 'dashboard';
    authType = 'auth';
    rendering = 'CSR';
    nextTarget = '(dashboard)/';
  }

  // For non-redirect routes, extract component
  if (!/Navigate/.test(fullLine)) {
    const compMatches = [...fullLine.matchAll(/<([A-Z]\w+)\s*\/>/g)];
    component = compMatches.length > 0 ? compMatches[compMatches.length - 1][1] : '(unknown)';
  }

  if (path) {
    routes.push({ path, component, roles, authType, section, rendering, nextTarget });
  }
}

// Remove duplicates (keep first occurrence)
const seen = new Set();
const uniqueRoutes = routes.filter(r => {
  if (seen.has(r.path)) return false;
  seen.add(r.path);
  return true;
});

// Sort by path for readability
uniqueRoutes.sort((a, b) => a.path.localeCompare(b.path));

// Build markdown
let md = '# Route Inventory: App.jsx -> Next.js App Router Mapping\n\n';
md += '**Source:** `client/src/App.jsx` (React Router v6 with HashRouter)\n\n';
md += '**Total routes:** ' + uniqueRoutes.length + '\n\n';
md += '## Legend\n\n';
md += '| Column | Description |\n';
md += '|--------|-------------|\n';
md += '| Path | Current React Router v6 path (HashRouter) |\n';
md += '| Component | Source page file (lazy import name) |\n';
md += '| Auth | public / auth (any logged-in user) / role (role-guarded) |\n';
md += '| Roles | Specific roles allowed when auth=role |\n';
md += '| Render | SSR (Server Component, SEO-critical) / CSR (Client Component, interactive/stateful) |\n';
md += '| Target | App Router folder path in findmedi-next/src/app/ |\n\n';

const sectionTitles = {
  'auth-pages': 'Auth Pages (public, no authentication)',
  'public-listings': 'Public Listing Pages (no auth, SEO-critical)',
  'hospital-shared': 'Hospital Admin Shared Routes',
  'superadmin': 'Super Admin Routes (role: superadmin)',
  'admin': 'Admin Routes (role: hospital_admin)',
  'patient': 'Patient Routes (role: patient)',
  'doctor': 'Doctor Routes (role: doctor)',
  'clinic': 'Clinic Doctor Routes (role: clinic_doctor)',
  'pharmacy-business': 'Pharmacy Business Routes (role: pharmacy_owner)',
  'lab-business': 'Lab Business Routes (role: lab_owner)',
  'delivery': 'Delivery Partner Routes (role: delivery_boy)',
  'dashboard': 'Dashboard Shell Routes (authenticated)',
  'other': 'Other Routes',
};

let count = 0;
const orderedSections = ['auth-pages', 'public-listings', 'superadmin', 'admin', 'hospital-shared',
  'patient', 'doctor', 'clinic', 'pharmacy-business', 'lab-business', 'delivery', 'dashboard', 'other'];

for (const key of orderedSections) {
  const sectionRoutes = uniqueRoutes.filter(r => r.section === key);
  if (sectionRoutes.length === 0) continue;

  md += '\n## ' + (sectionTitles[key] || key) + '\n\n';
  md += '| # | Path | Component | Auth | Roles | Render | Target |\n';
  md += '|---|------|-----------|------|-------|--------|--------|\n';
  sectionRoutes.forEach(r => {
    count++;
    md += '| ' + count + ' | `' + r.path + '` | ' + r.component + ' | ' + r.authType +
        ' | ' + (r.roles.join(', ') || '-') + ' | ' + r.rendering + ' | `' + r.nextTarget + '` |\n';
  });
}

// Also add hospital-shared section (Home + admin shared routes)
// Move Home to public-listings instead

md += '\n\n---\n\n## Summary\n\n';

const bySection = {};
uniqueRoutes.forEach(r => { bySection[r.section] = (bySection[r.section] || 0) + 1; });
md += '**Routes by section:**\n\n';
for (const k of orderedSections) {
  if (bySection[k]) md += '- ' + (sectionTitles[k] || k) + ': ' + bySection[k] + '\n';
}

const byAuth = {};
uniqueRoutes.forEach(r => { byAuth[r.authType] = (byAuth[r.authType] || 0) + 1; });
md += '\n**Routes by auth requirement:**\n\n';
for (const [k, v] of Object.entries(byAuth)) md += '- ' + k + ': ' + v + '\n';

const byRender = {};
uniqueRoutes.forEach(r => { byRender[r.rendering] = (byRender[r.rendering] || 0) + 1; });
md += '\n**Routes by rendering strategy:**\n\n';
for (const [k, v] of Object.entries(byRender)) md += '- ' + k + ': ' + v + '\n';

fs.writeFileSync('findmedi-next/docs/ROUTE_INVENTORY.md', md);
console.log('Done. Total unique routes:', uniqueRoutes.length);
console.log('By section:', JSON.stringify(bySection, null, 2));
console.log('By auth:', JSON.stringify(byAuth, null, 2));
console.log('By render:', JSON.stringify(byRender, null, 2));
