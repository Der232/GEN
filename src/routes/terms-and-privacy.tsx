import { createFileRoute, Link } from '@tanstack/react-router'
import {
  BookOpen,
  Shield,
  FileText,
  Sparkles,
  Lock,
  Scale,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Layers,
  ArrowRight,
} from 'lucide-react'

export const Route = createFileRoute('/terms-and-privacy')({
  component: TermsAndPrivacyPage,
})

function TermsAndPrivacyPage() {
  return (
    <div className="min-h-full py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* ─── Page Header ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold badge-neutral">
          <Scale className="h-3.5 w-3.5" />
          <span>Platform Documentation & Legal</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
          Terms, Privacy & User Guide
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-3xl leading-relaxed">
          Everything you need to know about using GEN, our commitment to safeguarding your study data, and the terms governing our AI-powered exam generation platform.
        </p>

        {/* Quick Nav Anchors */}
        <div className="flex items-center gap-2 pt-2 flex-wrap text-xs">
          <a
            href="#how-to-use"
            className="btn-secondary px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-500" />
            <span>How to Use</span>
          </a>
          <a
            href="#terms-of-service"
            className="btn-secondary px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <FileText className="h-3.5 w-3.5 text-amber-500" />
            <span>Terms of Service</span>
          </a>
          <a
            href="#privacy-policy"
            className="btn-secondary px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>Privacy Policy</span>
          </a>
        </div>
      </div>

      {/* ─── 1. HOW TO USE GEN ──────────────────────────────────────────────────── */}
      <section id="how-to-use" className="gen-card p-5 sm:p-7 md:p-8 space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)]">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              How to Use GEN
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              A quick 3-step guide to generating, practicing, and mastering any subject.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Step 1 */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-0.5 rounded badge-neutral">
                Step 1
              </span>
              <UploadCloud className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Generate from Topic or Files
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Type a topic directly, paste questions, or upload lecture slides (<code className="text-[11px] font-mono">.pptx</code>), textbooks (<code className="text-[11px] font-mono">.pdf</code>), or notes (<code className="text-[11px] font-mono">.docx</code>) up to 50 MB.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-0.5 rounded badge-neutral">
                Step 2
              </span>
              <Sparkles className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Configure Practice Mode
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Choose <strong>Instant Feedback Mode</strong> to get explanations and mathematical proofs after every question, or <strong>Exam Mode</strong> for timed, silent testing conditions.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-0.5 rounded badge-neutral">
                Step 3
              </span>
              <Layers className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Save &amp; Track Progress
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Exams are automatically saved to your workspace. Explore detailed analytics, review past attempts, and seamlessly link your guest account to a permanent email with zero data loss.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Link
            to="/generate"
            className="btn-primary inline-flex items-center gap-2 text-xs font-semibold px-4 py-2"
          >
            <span>Start Generating an Exam</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ─── 2. TERMS OF SERVICE ────────────────────────────────────────────────── */}
      <section id="terms-of-service" className="gen-card p-5 sm:p-7 md:p-8 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)]">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Terms of Service
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Effective date: January 1, 2026
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              1. Acceptance of Terms
            </h3>
            <p>
              By accessing or using the GEN platform (&ldquo;GEN&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access or use the service.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              2. Educational Purpose &amp; Academic Integrity
            </h3>
            <p>
              GEN is designed as a study companion, formative practice tool, and test preparation aid. It is intended to help students, educators, and lifelong learners test their comprehension and reinforce concepts. Users are solely responsible for complying with the honor codes and academic integrity policies of their respective educational institutions.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              3. AI-Generated Content Disclaimer
            </h3>
            <p>
              All questions, multiple-choice options, answers, explanations, and proofs generated on GEN are produced by artificial intelligence models. While our algorithms and validation pipelines strive for rigorous academic accuracy, AI models may occasionally produce erroneous, incomplete, or outdated information. All content is provided on an &ldquo;as-is&rdquo; basis without warranties of any kind. GEN should be used alongside standard course materials, verified textbooks, and instructor guidance.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              4. Fair Usage &amp; Rate Limits
            </h3>
            <p>
              To maintain service reliability and protect platform infrastructure, GEN enforces reasonable operational limits:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 text-xs text-[var(--text-muted)]">
              <li>Maximum file upload size of <strong>50 MB</strong> per reference document.</li>
              <li>Maximum of <strong>3 concurrent active uploads</strong> at any time.</li>
              <li>Maximum of <strong>15 document uploads</strong> per 24-hour period.</li>
              <li>A <strong>30-second cooldown</strong> between exam generation requests.</li>
              <li>Daily generation quotas: <strong>10 exams/day</strong> for guest accounts and <strong>25 exams/day</strong> for registered accounts.</li>
            </ul>
            <p className="mt-1.5">
              Automated scraping, denial-of-service attempts, unauthorized reverse-engineering, or bypassing rate limits via scripted session rotation is strictly prohibited.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              5. Intellectual Property &amp; Content Ownership
            </h3>
            <p>
              You retain all ownership rights to the original study notes, documents, and slides you upload to GEN. By uploading documents, you grant GEN a temporary, non-exclusive license solely to process and extract text to generate your requested exams. Question sets generated on the platform are licensed to you for your personal educational use.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3. PRIVACY POLICY ──────────────────────────────────────────────────── */}
      <section id="privacy-policy" className="gen-card p-5 sm:p-7 md:p-8 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)]">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Privacy Policy
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              How we collect, handle, and protect your information.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              1. Information We Collect
            </h3>
            <div className="space-y-2 mt-1.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Anonymous Guest Sessions:</strong> When you browse GEN without signing in, we create a lightweight anonymous session identifier stored in an HTTP-only browser cookie. No personal identity, name, or email is required.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Registered Accounts:</strong> When you choose to create or link an account, we collect your email address, display name, and securely salted and hashed password credentials.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Uploaded Study Materials:</strong> Reference files (PDF, DOCX, PPTX) are stored in secure cloud object storage (Cloudflare R2) solely for document parsing and text extraction.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              2. How We Use &amp; Safeguard Your Data
            </h3>
            <p>
              Your data is strictly utilized to deliver the core service: generating personalized exams, grading test submissions, providing feedback explanations, and displaying your historical performance analytics.
            </p>
            <div className="mt-2 p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
              <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-500" />
                <span>Our Privacy Commitments:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
                <li>We <strong>never sell, rent, or trade</strong> your personal information or study notes to third parties or data brokers.</li>
                <li>Your uploaded documents are <strong>not used to train</strong> public commercial foundational models.</li>
                <li>All data transmission is protected using modern end-to-end TLS/HTTPS encryption.</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              3. Data Retention &amp; User Control
            </h3>
            <p>
              You maintain complete control over your educational data. You may delete individual exams, documents, or attempts at any time directly through your dashboard. You can also permanently delete your entire account and associated records via your <Link to="/settings" className="font-semibold text-[var(--text-primary)] underline hover:opacity-80">Account Settings</Link>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              4. Changes to This Policy
            </h3>
            <p>
              We may update this Privacy Policy from time to time to reflect platform enhancements or legal requirements. Material updates will be reflected on this page with an updated revision date.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
