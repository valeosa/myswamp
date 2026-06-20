import LegalShell from '../legal-shell'

const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL

export default function PrivacyPage() {
  return (
    <LegalShell title="privacy policy" updated="20 June 2026">
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
          <li>Your task dumps, assigned frog, small action, completion status, and timestamps when you use a signed-in account.</li>
          <li>Email and feedback preferences you choose in settings.</li>
          <li>Basic product analytics: page visits and counts of dumps, generated frogs, and completions. The first-party analytics table does not store task text, your name, email, or IP address.</li>
          <li>Technical information processed by hosting, security, and analytics providers as part of operating the service.</li>
        </ul>
      </section>

      <section>
        <h2>how we use it</h2>
        <p>We process account and task information to provide the service you request. We use limited usage analytics and security logs for our legitimate interests in protecting, debugging, and improving mySwamp. Optional product emails rely on your consent, which you can withdraw in preferences.</p>
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
        <p>Account-linked frogs and task history are kept while your account is active so the swamp can remember. Hiding a frog removes it from your visible history but does not immediately erase the underlying record. Operational and analytics records are kept only while reasonably needed to run, secure, and evaluate this early product. You can request account data deletion using the contact method above.</p>
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
