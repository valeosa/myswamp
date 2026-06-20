import LegalShell from '../legal-shell'

const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL

export default function TermsPage() {
  return (
    <LegalShell title="terms of service" updated="20 June 2026">
      <section>
        <h2>using mySwamp</h2>
        <p>By using mySwamp, you agree to these terms. mySwamp is an experimental task-prioritisation service designed to surface one manageable next action. You must be at least 13 years old and legally able to agree to these terms.</p>
      </section>

      <section>
        <h2>your account</h2>
        <p>You are responsible for activity under your account and for keeping access to it secure. Provide accurate account information and tell us promptly if you believe your account has been compromised.</p>
      </section>

      <section>
        <h2>your task content</h2>
        <p>You keep ownership of the content you enter. You give mySwamp only the limited permission needed to process, store, and display it back to you and to operate the service. Do not submit information you do not have the right to use, or highly sensitive information that is unnecessary for choosing a task.</p>
      </section>

      <section>
        <h2>AI-generated suggestions</h2>
        <p>Frogs and small actions are generated with AI and may be incomplete, unsuitable, or wrong. They are organisational suggestions, not medical, legal, financial, safety, or other professional advice. You remain responsible for deciding whether an action is appropriate.</p>
      </section>

      <section>
        <h2>acceptable use</h2>
        <p>Do not abuse, overload, scrape, reverse engineer, interfere with, or attempt unauthorised access to mySwamp or its providers. Do not use the service to violate law, harm others, or process content that is unlawful or infringes another person’s rights.</p>
      </section>

      <section>
        <h2>availability and changes</h2>
        <p>This is a pre-launch service. Features may change, pause, or disappear, and data loss may occur despite reasonable care. We may limit or suspend access where needed for security, maintenance, abuse prevention, or legal compliance.</p>
      </section>

      <section>
        <h2>warranties and liability</h2>
        <p>mySwamp is provided “as is” and “as available”. To the fullest extent permitted by law, we do not promise uninterrupted availability or that suggestions will be accurate. Nothing in these terms excludes liability that cannot legally be excluded. Otherwise, we are not responsible for indirect or consequential loss arising from use of the service.</p>
      </section>

      <section>
        <h2>ending use</h2>
        <p>You may stop using mySwamp at any time. We may suspend or end access for serious or repeated breaches of these terms. Provisions that naturally continue after termination—including ownership, disclaimers, and liability limits—will remain in effect.</p>
      </section>

      <section>
        <h2>law and contact</h2>
        <p>These terms are governed by the laws of England and Wales, and disputes are subject to its courts, except where consumer law gives you rights in another place. {privacyEmail ? <>Questions can be sent to <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</> : <>Questions can be raised through the contact channel through which you received access to mySwamp.</>}</p>
      </section>
    </LegalShell>
  )
}
