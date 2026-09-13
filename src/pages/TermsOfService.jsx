import React from 'react'
import { ArrowLeft, FileText, Scale, ShieldAlert, CheckCircle, Mail, ExternalLink } from 'lucide-react'

const TermsOfService = ({ onBack }) => {
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
            <Scale className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display text-starlight tracking-wide">
            Polaris Terms of Service
          </h1>
          <p className="text-sm text-nova/70 font-mono">
            Effective Date: September 2026 | Last Updated: September 13, 2026
          </p>
        </div>

        {/* 1. Acceptance of Terms */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>1. Acceptance of Terms</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            By accessing or using the Polaris web application ("Service", "Application", or "Polaris"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the application.
          </p>
        </section>

        {/* 2. Description of Service */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>2. Description of Service</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Polaris is an offline-first personal productivity and cognitive operating system designed and created by <strong className="text-starlight">Anindita Sarker Aloka</strong>. The application delivers features including life domain mapping, Weighted Shortest Job First (WSJF) prioritization, interactive 2D Eisenhower matrix visualization, habit and streak tracking, curriculum syllabus logging, Pomodoro timers, and milestone roadmaps.
          </p>
        </section>

        {/* 3. User Accounts and Authentication */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>3. User Accounts and Authentication</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Authentication is provided through Google OAuth 2.0 and Supabase Authentication. You are responsible for safeguarding your account credentials and for all activities that occur during your sessions. Please notify the developer immediately of any unauthorized access.
          </p>
        </section>

        {/* 4. Acceptable Use Policy */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>4. Acceptable Use Policy</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            You agree to use Polaris solely for lawful personal productivity workflows. You agree not to:
          </p>
          <ul className="space-y-2 text-sm text-starlight/80 list-disc list-inside ml-2">
            <li>Attempt to probe, breach, or compromise the security of the application or backend database.</li>
            <li>Disrupt or degrade the performance of the servers, network, or third-party APIs.</li>
            <li>Inject malicious scripts, viruses, or harmful automated scraping routines.</li>
            <li>Impersonate any individual or entity.</li>
          </ul>
        </section>

        {/* 5. Third-Party Services and Integrations */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>5. Third-Party Services and Integrations</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Polaris integrates with third-party providers including Supabase and Google APIs (Google Calendar, Google Tasks). Access to these integrations is subject to the terms and privacy conditions of those providers. Polaris does not assume responsibility for third-party service availability or alterations.
          </p>
        </section>

        {/* 6. Intellectual Property */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>6. Intellectual Property</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            The Polaris application, including its source code, visualizers, user interface design, and branding, is the intellectual property of <strong className="text-starlight">Anindita Sarker Aloka</strong>. You retain all ownership rights to your personal tasks, habit records, notes, and milestones created within the app.
          </p>
        </section>

        {/* 7. Disclaimer of Warranties */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-gold">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-xl font-display text-gold">7. Disclaimer of Warranties</h2>
          </div>
          <p className="text-sm text-starlight/90 leading-relaxed">
            Polaris is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied. While built with resilient local storage and offline sync capabilities, the developer does not warrant uninterrupted, error-free operation or absolute prevention of data loss. Users are encouraged to maintain frequent backups via the JSON data export feature in Settings.
          </p>
        </section>

        {/* 8. Limitation of Liability */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>8. Limitation of Liability</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            To the maximum extent permitted by applicable law, the developer of Polaris shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your access to or inability to use the Service.
          </p>
        </section>

        {/* 9. Modifications to Terms */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <span>9. Modifications to Terms</span>
          </h2>
          <p className="text-sm text-starlight/90 leading-relaxed">
            We reserve the right to modify these Terms at any time. Changes will take effect upon posting to this page with an updated revision date. Continued usage of Polaris indicates your consent to the updated terms.
          </p>
        </section>

        {/* 10. Governing Law and Contact Information */}
        <section className="glass border border-pulsar/30 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-gold">
            <Mail className="w-5 h-5" />
            <h2 className="text-xl font-display text-gold">10. Governing Law and Contact Information</h2>
          </div>
          <p className="text-sm text-starlight/90 leading-relaxed">
            For questions or legal notices regarding these Terms, contact:
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

        {/* Footer */}
        <div className="text-center py-6 text-xs text-nova/60 font-mono space-y-2 border-t border-pulsar/20">
          <p>&copy; 2026 Polaris. Developed by Anindita Sarker Aloka.</p>
          <p className="space-x-3">
            <button onClick={handleBack} className="text-gold hover:underline">
              Return to Polaris
            </button>
            <span>·</span>
            <a href="#/privacy" className="text-gold hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService
