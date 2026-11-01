import type { ReactNode } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";

export const metadata = {
  title: "Privacy · Nehemiah's Temple",
  description:
    "What Nehemiah's Temple collects through Tap Hub, who can see it, and how to have it removed.",
};

/** Last substantive revision. Shown at the top so people can tell whether
 *  they're reading something current. */
const EFFECTIVE = "October 31, 2026";

const CONTACT = "office@nehtemple.org";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <h2
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "19px",
          lineHeight: 1.1,
          color: "#f4f1ea",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

const pStyle: React.CSSProperties = {
  fontSize: "14.5px",
  lineHeight: 1.62,
  color: "#cdd3e0",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "9px",
  paddingLeft: "18px",
  fontSize: "14.5px",
  lineHeight: 1.58,
  color: "#cdd3e0",
};

const termStyle: React.CSSProperties = { color: "#f4f1ea", fontWeight: 700 };

export default function PrivacyPage() {
  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="Privacy" subtitle="How we handle your information" />

        <div
          className="th-up"
          style={{
            padding: "22px 20px 56px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          <p style={{ ...pStyle, color: "#9aa3b8", fontSize: "12.5px", fontWeight: 700 }}>
            Effective {EFFECTIVE}
          </p>

          <p style={pStyle}>
            This explains what Nehemiah&apos;s Temple of the Apostolic Faith collects through Tap
            Hub &mdash; our member portal and the forms linked from it &mdash; who can see it, and
            how to have it changed or removed. We&apos;ve written it plainly instead of in legal
            language, because it should be possible to actually read.
          </p>

          <p style={pStyle}>
            The short version: we collect what you give us so the church can serve you and follow
            up with you. <strong style={termStyle}>We never sell it, rent it, or use it for
            advertising</strong>, and we don&apos;t share it with anyone outside the ministry except
            the service providers listed below that help us run the site.
          </p>

          <Section title="What we collect">
            <p style={pStyle}>Only what you choose to give us, and only when you do something:</p>
            <ul style={listStyle}>
              <li>
                <strong style={termStyle}>Creating an account.</strong>{" "}Your name, email address,
                and a password &mdash; or, if you sign in with Google, your name, email address, and
                profile picture from your Google account. A phone number only if you add one.
              </li>
              <li>
                <strong style={termStyle}>&ldquo;I&apos;m New Here&rdquo; connect card.</strong>{" "}Your
                name, and whatever contact details and interests you share.
              </li>
              <li>
                <strong style={termStyle}>Checking in on a Sunday.</strong>{" "}Your name and whether
                you&apos;re a guest or a regular attender. Guests can add a phone number or an
                email, and someone from the welcome team follows up when you do &mdash; leaving
                them is <strong style={termStyle}>entirely optional</strong>, and checking in
                without them works the same. A check-in kiosk also stores a token on that device so
                it can recognise returning families, not a person.
              </li>
              <li>
                <strong style={termStyle}>Prayer requests.</strong>{" "}Your request, and your name and
                contact details if you give them. You can submit a request without either.
              </li>
              <li>
                <strong style={termStyle}>Feedback.</strong>{" "}A rating, a topic, your message, your
                name if you add it, and any photos you attach.
              </li>
              <li>
                <strong style={termStyle}>Signing up for an event.</strong>{" "}Your name, a contact
                detail, whether you&apos;re attending or volunteering, and your answers to any
                questions that event asks.
              </li>
              <li>
                <strong style={termStyle}>Asking to meet with the Pastor.</strong>{" "}Your name, your
                contact details, and what you&apos;d like to discuss.
              </li>
              <li>
                <strong style={termStyle}>The Ignite youth and family form.</strong>{" "}See the section
                on children below.
              </li>
            </ul>
            <p style={pStyle}>
              We don&apos;t use advertising trackers or third-party analytics. The site sets cookies
              only to keep you signed in and to sign you out after a period of inactivity.
            </p>
          </Section>

          <Section title="Who can see it">
            <p style={pStyle}>
              Access in the portal depends on a person&apos;s role, and most of the church sees
              nothing:
            </p>
            <ul style={listStyle}>
              <li>
                <strong style={termStyle}>Members</strong>{" "}see only their own submissions and
                sign-ups.
              </li>
              <li>
                <strong style={termStyle}>Ministry leads</strong>{" "}see submissions for the ministry
                they lead.
              </li>
              <li>
                <strong style={termStyle}>Pastoral staff</strong>{" "}see everything in the portal.
              </li>
              <li>
                A prayer request marked{" "}
                <strong style={termStyle}>&ldquo;Bishop only&rdquo; goes to the Bishop alone</strong>{" "}
                and is hidden from everyone else, including other pastoral staff.
              </li>
            </ul>
            <p style={pStyle}>
              Prayer requests are treated as confidential by default. Nothing you submit appears
              publicly unless you explicitly choose to share it &mdash; for example, by marking a
              request for the prayer wall.
            </p>
          </Section>

          <Section title="Children's information">
            <p style={pStyle}>
              The Ignite parent and family form is filled in by a parent or guardian, never by a
              child. It asks for the guardian&apos;s contact details and, for each child, their name,
              date of birth, grade, school, shirt size, interests, and what would help us support
              them spiritually. Parents may also add health notes, and we ask for only what Ignite
              leadership needs in order to care for a child safely.
            </p>
            <p style={pStyle}>
              This information is visible only to Ignite leadership and pastoral staff. It is not
              used for anything other than running the youth ministry, and it is never shared
              outside it. A parent can ask us to correct or delete their family&apos;s information at
              any time, and we&apos;ll do it.
            </p>
          </Section>

          <Section title="Signing in with Google">
            <p style={pStyle}>
              If you use the Google button to sign in, Google tells us your name, your email
              address, and your profile picture. That&apos;s all we ask for and all we receive.
            </p>
            <ul style={listStyle}>
              <li>
                <strong style={termStyle}>We never see your Google password.</strong>{" "}You enter it
                with Google, not with us.
              </li>
              <li>
                We have <strong style={termStyle}>no access to your Gmail, Drive, Photos, or
                contacts</strong>, and we never request it.
              </li>
              <li>
                If you already had a Tap Hub account with the same email address, signing in with
                Google uses that same account rather than making a second one.
              </li>
              <li>
                You can disconnect Tap Hub at any time in your Google account settings, and still
                sign in with an email and password.
              </li>
            </ul>
          </Section>

          <Section title="Services we use">
            <p style={pStyle}>
              Running the site means a handful of companies process some of this information on our
              behalf. Each is bound by its own agreement with us, and none of them may use what they
              handle for their own purposes:
            </p>
            <ul style={listStyle}>
              <li>
                <strong style={termStyle}>Supabase</strong>{" "}&mdash; the database and sign-in system
                where everything is stored.
              </li>
              <li>
                <strong style={termStyle}>Vercel</strong>{" "}&mdash; hosting for the site itself.
              </li>
              <li>
                <strong style={termStyle}>Resend</strong>{" "}&mdash; sending email, such as a
                confirmation link or a notification to the right ministry.
              </li>
              <li>
                <strong style={termStyle}>Twilio</strong>{" "}&mdash; text messages, where we use them.
              </li>
              <li>
                <strong style={termStyle}>Google</strong>{" "}&mdash; the church calendar, staff chat,
                and Google sign-in.
              </li>
              <li>
                <strong style={termStyle}>OpenAI</strong>{" "}&mdash; an assistant that helps staff
                manage events and announcements. It is available to staff only, and your submissions
                are not used to train anyone&apos;s models.
              </li>
            </ul>
          </Section>

          <Section title="How long we keep it">
            <p style={pStyle}>
              We keep submissions for as long as they&apos;re useful to the ministry, which in
              practice means indefinitely unless you ask us to remove them. Attendance records are
              kept so we can see patterns over time and follow up with people we haven&apos;t seen.
            </p>
            <p style={pStyle}>
              If you ask us to delete your account, we remove it and your profile. Submissions you
              made are kept but are no longer linked to you &mdash; or we can delete those too, if
              you ask.
            </p>
          </Section>

          <Section title="Your choices">
            <p style={pStyle}>
              Email <a href={`mailto:${CONTACT}`} style={{ color: "#e7b84e", fontWeight: 700 }}>{CONTACT}</a>{" "}
              and we&apos;ll help you:
            </p>
            <ul style={listStyle}>
              <li>See what we have about you or your family.</li>
              <li>Correct anything that&apos;s wrong.</li>
              <li>Delete your account, a particular submission, or your family&apos;s Ignite record.</li>
              <li>Stop contacting you.</li>
            </ul>
            <p style={pStyle}>
              You don&apos;t need to give a reason, and asking will never affect how you&apos;re
              treated at church.
            </p>
          </Section>

          <Section title="Keeping it safe">
            <p style={pStyle}>
              Information is encrypted in transit and at rest, and the database is configured so
              that nothing is readable without going through the portal&apos;s own permission checks.
              Photos attached to feedback are stored privately and are not accessible by link alone.
              No system is perfectly secure, but we don&apos;t collect more than we need, which is
              the best protection there is.
            </p>
          </Section>

          <Section title="Changes">
            <p style={pStyle}>
              If we change how we handle your information in a way that matters, we&apos;ll update
              this page and change the date at the top.
            </p>
          </Section>

          <Section title="Questions">
            <p style={pStyle}>
              Nehemiah&apos;s Temple of the Apostolic Faith &mdash; Madison Heights, Michigan.
              <br />
              <a href={`mailto:${CONTACT}`} style={{ color: "#e7b84e", fontWeight: 700 }}>
                {CONTACT}
              </a>
            </p>
          </Section>
        </div>
      </div>
    </PhoneShell>
  );
}
