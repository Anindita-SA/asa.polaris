import React from 'react'
import { ArrowLeft, ShieldCheck, Lock, Database, ExternalLink, HardDrive, RefreshCw, Mail, Globe } from 'lucide-react'

const PrivacyPolicy = ({ onBack }) => {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.hash = ''
      window.location.pathname = '/asa.polaris/'
    }
  }

  return (
    <div className="min-h-screen w-full bg-void text-starlight py-10 px-4 md:px-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-pulsar/30 text-gold hover:text-gold-dim hover:border-gold/50 transition-colors text-sm font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Polaris</span>
          </button>
          <span className="text-xs font-mono text-nova/60 uppercase tracking-wider">
            Legal Documentation
          </span>
        </div>

        {/* Header */}
        <div className="glass border border-pulsar/30 rounded-2xl p-6 md:p-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-gold text-xs font-mono uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy &amp; Security Policy</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display text-starlight tracking-wide">
            Polaris Privacy Policy
          </h1>
          <p className="text-sm text-nova/70 font-mono">
            Effective Date: September 2026 | Last Updated: September 13, 2026
          </p>
        </div>

        {/* 1. Overview */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>1. Overview and Scope</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Polaris is a local-first personal productivity Progressive Web Application (PWA) designed and developed by <strong className="text-starlight">Anindita Sarker Aloka</strong>. Polaris serves as a centralized personal command center offering 2D Eisenhower matrix visualization, Weighted Shortest Job First (WSJF) prioritization, daily focus planning, curriculum logging, and habit tracking.
          </p>
          <p className="text-sm text-starlight/90 leading-relaxed">
            This Privacy Policy outlines how Polaris collects, uses, stores, and protects personal information across the application and its connected services.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>2. Information We Collect</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Polaris collects only the minimum information necessary to provide seamless personal productivity features:
          </p>
          <ul className="space-y-2 text-sm text-starlight/80 list-disc list-inside ml-2">
            <li>
              <strong className="text-starlight">Google Account Details:</strong> Profile name, email address, and avatar URL provided through Google OAuth.
            </li>
            <li>
              <strong className="text-starlight">Google Calendar &amp; Tasks Data:</strong> When explicitly authorized by the user, read and write access to calendar events and task items via authorized OAuth scopes for timeline planning.
            </li>
            <li>
              <strong className="text-starlight">User-Generated Content:</strong> Tasks, subtasks, personal goals, habit logs, curriculum notes, milestones, and daily reflections.
            </li>
            <li>
              <strong className="text-starlight">Client Device Preferences:</strong> Matrix filter preferences, notification toggles, and session tokens stored locally in browser storage.
            </li>
          </ul>
        </section>

        {/* 3. How We Use Information */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>3. How We Use Information</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Your data is used strictly to power your personal productivity workflows:
          </p>
          <ul className="space-y-2 text-sm text-starlight/80 list-disc list-inside ml-2">
            <li>Authenticating user sessions and isolating personal workspace data.</li>
            <li>Ranking and sorting tasks using the Eisenhower Matrix and WSJF algorithmic scores.</li>
            <li>Visualizing daily schedules and synchronized Google Calendar commitments.</li>
            <li>Tracking habit streaks and calculating leveling XP progressions.</li>
            <li>Facilitating offline data access and background synchronization via IndexedDB.</li>
          </ul>
        </section>

        {/* 4. Google API Services User Data Policy & Limited Use Disclosure */}
        <section className="glass border border-amber-500/50 bg-slate-900/60 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-gold">
            <Lock className="w-5 h-5" />
            <h2 className="text-xl font-display text-gold">
              4. Google API Services User Data Policy &amp; Limited Use Disclosure
            </h2>
          </div>

          <div className="bg-void/80 border-l-4 border-gold p-4 rounded-r-lg space-y-2">
            <p className="text-sm font-semibold text-starlight">
              Google Limited Use Compliance Statement:
            </p>
            <p className="text-sm text-starlight/90 leading-relaxed italic">
              Polaris's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline hover:text-gold-dim"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-starlight">
              Core Principles of Google User Data Handling:
            </h3>
            <ul className="space-y-2 text-sm text-starlight/80 list-disc list-inside ml-2">
              <li>
                <strong className="text-starlight">Zero Advertising or Marketing:</strong> We never use Google user data for serving advertisements, retargeting campaigns, or commercial market research.
              </li>
              <li>
                <strong className="text-starlight">No Unauthorized Data Transfers:</strong> We do not transfer Google user data to third parties unless required to provide core productivity features explicitly requested by you, or required by law.
              </li>
              <li>
                <strong className="text-starlight">Human Access Restrictions:</strong> Humans do not read your Google user data unless you provide explicit permission for troubleshooting, or if required for security investigation or legal compliance.
              </li>
              <li>
                <strong className="text-starlight">No AI Model Training:</strong> Google user data is not used to train generalized artificial intelligence or machine learning models.
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Data Storage, Isolation, and Security */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-gold">
            <Database className="w-5 h-5" />
            <h2 className="text-xl font-display text-gold">5. Data Storage, Isolation, and Security</h2>
          </div>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Polaris enforces strict security protocols at all architecture layers:
          </p>
          <ul className="space-y-2 text-sm text-starlight/80 list-disc list-inside ml-2">
            <li>
              <strong className="text-starlight">Row Level Security (RLS):</strong> Backend records in PostgreSQL (hosted on Supabase) are strictly guarded by PostgreSQL RLS policies scoped to the authenticated user ID.
            </li>
            <li>
              <strong className="text-starlight">Local Offline Isolation:</strong> Offline records stored in browser IndexedDB (via Dexie.js) are sandboxed to your browser origin.
            </li>
            <li>
              <strong className="text-starlight">Encrypted Transport:</strong> All data in transit is encrypted using HTTPS / TLS 1.3 encryption.
            </li>
          </ul>
        </section>

        {/* 6. Data Retention, Export, and Deletion */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-gold">
            <HardDrive className="w-5 h-5" />
            <h2 className="text-xl font-display text-gold">6. Data Retention and Deletion</h2>
          </div>
          <p className="text-sm text-starlight/90 leading-relaxed">
            You retain full ownership and portability of your data:
          </p>
          <ul className="space-y-2 text-sm text-starlight/80 list-disc list-inside ml-2">
            <li>
              <strong className="text-starlight">Instant Data Export:</strong> You can export a full JSON backup of all tables anytime directly from the in-app Settings panel.
            </li>
            <li>
              <strong className="text-starlight">Account Deletion:</strong> You can request permanent account and data deletion by contacting us at{' '}
              <a href="mailto:anindita.polaris@gmail.com" className="text-gold underline hover:text-gold-dim">
                anindita.polaris@gmail.com
              </a>
              . Your database records will be permanently purged upon request.
            </li>
          </ul>
        </section>

        {/* 7. Third-Party Services */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold">7. Third-Party Services</h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Polaris integrates with the following third-party infrastructure providers:
          </p>
          <ul className="space-y-2 text-sm text-starlight/80 list-disc list-inside ml-2">
            <li>
              <strong className="text-starlight">Supabase:</strong> Managed PostgreSQL database, authentication, and real-time synchronization.
            </li>
            <li>
              <strong className="text-starlight">Google APIs:</strong> Google OAuth 2.0 authentication, Google Calendar, and Google Tasks APIs.
            </li>
          </ul>
        </section>

        {/* 8. Cookies and Storage */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold">8. Cookies and Local Storage</h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Polaris does not use advertising or tracking cookies. Local browser storage and IndexedDB are used exclusively to persist active session tokens, UI filter preferences, and cached productivity records for offline operation.
          </p>
        </section>

        {/* 9. Contact Information */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-gold">
            <Mail className="w-5 h-5" />
            <h2 className="text-xl font-display text-gold">9. Contact Information</h2>
          </div>
          <p className="text-sm text-starlight/90 leading-relaxed">
            For privacy inquiries, questions, or data deletion requests, contact the developer:
          </p>
          <div className="space-y-1.5 text-sm text-starlight/80 font-mono">
            <p><strong className="text-starlight font-sans">Developer:</strong> Anindita Sarker Aloka</p>
            <p>
              <strong className="text-starlight font-sans">Email:</strong>{' '}
              <a href="mailto:anindita.polaris@gmail.com" className="text-gold underline hover:text-gold-dim">
                anindita.polaris@gmail.com
              </a>
            </p>
            <p>
              <strong className="text-starlight font-sans">GitHub:</strong>{' '}
              <a
                href="https://github.com/Anindita-SA/asa.polaris"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline hover:text-gold-dim inline-flex items-center gap-1"
              >
                <span>github.com/Anindita-SA/asa.polaris</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            </p>
          </div>
        </section>

        {/* 10. Effective Date & Updates */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-gold">
            <RefreshCw className="w-5 h-5" />
            <h2 className="text-xl font-display text-gold">10. Effective Date &amp; Updates</h2>
          </div>
          <p className="text-sm text-starlight/90 leading-relaxed">
            This policy is effective as of September 2026. Any updates will be reflected with a revised "Last Updated" timestamp on this page.
          </p>
        </section>

        {/* Footer */}
        <div className="text-center py-6 text-xs text-nova/60 font-mono space-y-2 border-t border-pulsar/20">
          <p>&copy; 2026 Polaris. Developed by Anindita Sarker Aloka.</p>
          <p className="space-x-3">
            <button onClick={handleBack} className="text-gold hover:underline">
              Return to Polaris
            </button>
            <span>·</span>
            <a href="#/terms" className="text-gold hover:underline">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
