import LegalShell from '../legal-shell'

const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL

export default function PrivacyPage() {
  return (
    <LegalShell title="privacy policy" updated="21 June 2026">
      <section>
        <h2>the short version</h2>
        <p>mySwamp uses the information you provide to choose a next action, remember your frogs when you sign in, understand whether the product is useful, and contact you only where you have asked us to. Task dumps are not sold.</p>
      </section>

      <section>
        <h2>who is responsible</h2>
        <p>mySwamp is an independent early-stage product operated by its founder in the United Kingdom. {privacyEmail ? <>For privacy questions or requests, email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</> : <>For privacy questions or requests, use the contact channel through which you received access to mySwamp.</>}</p>
      </section>

      <section>
        <h2>what we collect</h2>
        <ul>
          <li>Account identifiers and sign-in information handled by Clerk.</li>
          <li>Your task dumps, assigned frog, tadpoles, small action, frog/tadpole completion status, whether tadpoles were cleared individually or in bulk, and associated timestamps when you use a signed-in account.</li>
          <li>If you opt into Deep Swamp analysis, each task in a dump, which task became the frog, your local timezone/hour/day, and later completion or “not yet” events are stored together to look for your personal patterns.</li>
          <li>Water marks you choose to add in memory, including season, life context, energy, moment, and when you marked them.</li>
          <li>Email and feedback preferences you choose in settings.</li>
          <li>Basic product analytics: page visits and counts of dumps, generated frogs, and completions. The first-party analytics table does not store task text, your name, email, or IP address.</li>
          <li>Technical information processed by hosting, security, and analytics providers as part of operating the service.</li>
        </ul>
      </section>

      <section>
        <h2>how we use it</h2>
        <p>We process account and task information to provide the service you request. We use limited usage analytics and security logs for our legitimate interests in protecting, debugging, and improving mySwamp. Optional product emails rely on your consent, which you can withdraw in preferences.</p>
        <p>Deep Swamp analysis is optional and begins only after you enable it in preferences. Turning it off stops new Deep Swamp collection and removes the additional task-item and local-time context used for that analysis. Your ordinary frog history remains until you hide it or request account deletion.</p>
        <p>Water marks are saved as part of your memory and are not attached to a single frog. If Deep Swamp analysis is enabled, they may be used as context for frogs that occurred during that period.</p>
      </section>

      <section>
        <h2>AI processing</h2>
        <p>Your current task dump is sent to the OpenAI API so one task and a small next action can be selected. Guest dumps are not stored in the mySwamp database. OpenAI states that API data is not used to train its models by default and may be retained for abuse monitoring for up to 30 days.</p>
      </section>

      <section>
        <h2>service providers</h2>
        <p>We use <a href="https://clerk.com/legal/privacy" target="_blank" rel="noreferrer">Clerk</a> for authentication, <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase</a> for database services, <a href="https://openai.com/policies/api-data-usage-policies/" target="_blank" rel="noreferrer">OpenAI</a> for frog generation, and <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Vercel</a> for hosting and web analytics. These providers may process data in other countries using their contractual safeguards.</p>
      </section>

      <section>
        <h2>retention and deletion</h2>
        <p>Account-linked frogs and task history are kept while your account is active so the swamp can remember. Hiding a frog removes it from your visible history but does not immediately erase the underlying record. You can permanently delete your account and all account-linked frogs, tadpoles, events, water marks, preferences, and Deep Swamp data from preferences. Aggregate first-party analytics contain no account identifier or task text and cannot be linked back to the deleted account.</p>
      </section>

      <section>
        <h2>your rights</h2>
        <p>Depending on where you live, you may have rights to access, correct, erase, restrict, object to, or receive a copy of your personal data. You may withdraw email consent at any time. UK users may complain to the <a href="https://ico.org.uk/make-a-complaint/data-protection-complaints/" target="_blank" rel="noreferrer">Information Commissioner’s Office</a>.</p>
      </section>

      <section>
        <h2>changes</h2>
        <p>This notice may change as mySwamp develops. Material changes will be shown in the product or communicated where appropriate.</p>
      </section>
    </LegalShell>
  )
}
