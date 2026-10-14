/** R1 — Health Content Editor & Medical Reviewer dashboard (wrapper over RoleDashboardShell). */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'content-editor',
  title: '✍️ Health Content & Medical Review CMS Dashboard',
  subtitle: 'Evidence-based articles, doctor fact-checks, translation & clinical citations',
  permissions: ['profile:view', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Articles in Drafting', value: '18', hint: 'Editorial pipeline' },
    { label: 'Doctor Review Queue', value: '7', hint: 'Specialist sign-off' },
    { label: 'Published Guides', value: '142', hint: '100% Medically verified' },
    { label: 'Takedown/Revision Requests', value: '0', hint: '0 DMCA / Ethics flags' },
  ],
  tasks: [
    { id: 't1', text: 'Assign Type-2 Diabetes management diet guide to Dr. Kapoor (Endocrinologist)' },
    { id: 't2', text: 'Verify peer-reviewed clinical citations for pediatric fever dosage chart' },
    { id: 't3', text: 'Review Hindi vernacular translation of Hypertension home-care guide' },
  ],
  alerts: [
    { id: 'a1', text: '1 article flagged for unreferenced homeopathic claim — Medical review required', level: 'warn' },
    { id: 'a2', text: 'Routine 12-month medical content freshness audit due for 14 articles', level: 'info' },
  ],
  domainModules: [
    { key: 'cms-workspace', emoji: '📝', label: 'Health Article CMS & WYSIWYG', description: 'Author evidence-backed articles with schema.org MedicalWebPage semantic structured data.', ctaLabel: 'Open CMS', ctaHref: '/dashboard/content-editor?tab=docs' },
    { key: 'medical-signoff', emoji: '🩺', label: 'Doctor Review & Verification', description: 'Two-stage clinical sign-off workflow displaying verified doctor badge and review date.', ctaLabel: 'Review Queue', ctaHref: '/dashboard/content-editor?tab=support' },
    { key: 'regional-translations', emoji: '🌐', label: 'Vernacular Translation Pipeline', description: 'Localize clinical guides into Hindi, Bengali, Tamil, Telugu, Marathi with physician QA.', ctaLabel: 'Translations Desk', ctaHref: '/dashboard/content-editor?tab=profile' },
    { key: 'citation-audit', emoji: '🔬', label: 'Scientific Evidence Citation Vault', description: 'Maintain PubMed, Cochrane, ICMR & WHO reference links for all published statements.', ctaLabel: 'Citation Vault', ctaHref: '/dashboard/content-editor?tab=docs' },
  ],
};

export default function ContentEditorDashboard() {
  return <RoleDashboardShell config={config} />;
}
