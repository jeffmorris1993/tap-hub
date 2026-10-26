import Image from "next/image";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";

export const metadata = { title: "Give · Nehemiah's Temple" };

const GIVE_OPTIONS = [
  {
    href: "https://www.givelify.com/donate/nehemiahs-temple-of-the-apostolic-faith-madison-heights-mi-2j7wy5NDE5NjE=/donation/amount",
    bg: "#ff5a1f",
    color: "#0b101c",
    title: "Give with Givelify",
    sub: null,
    logo: "/give/givelify-logo.png",
    logoBg: "#fff",
    logoFit: "contain" as const,
  },
  {
    href: "https://cash.app/$NehemiahsTemple",
    bg: "#00d632",
    color: "#0b101c",
    title: "Give with Cash App",
    sub: "$NehemiahsTemple",
    logo: "/give/cashapp-logo.png",
    logoBg: "transparent",
    logoFit: "cover" as const,
  },
  {
    href: "https://www.nehtemple.org/give/",
    bg: "#1f78c1",
    color: "#fff",
    title: "Give on our website",
    sub: "Sharefaith Giving",
    logo: "/give/sharefaith-logo.png",
    logoBg: "#fff",
    logoFit: "contain" as const,
  },
];

export default function GivePage() {
  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <BackBar title="Give" subtitle="Support the ministry" />

        <div
          className="th-up"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "24px 20px 40px",
            gap: "32px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "center", marginBottom: "8px" }}>
              <h2
                style={{
                  fontFamily: "var(--font-anton)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  fontSize: "34px",
                  lineHeight: 1,
                }}
              >
                How would you
                <br />
                <span style={{ color: "#e7b84e" }}>like to give?</span>
              </h2>
              <p style={{ color: "#aab3c5", fontSize: "16px", fontWeight: 500, lineHeight: 1.5 }}>
                Pick one. It opens in a new window.
              </p>
            </div>

            {GIVE_OPTIONS.map((opt) => (
              <a
                key={opt.title}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  minHeight: "84px",
                  padding: "12px 18px 12px 12px",
                  borderRadius: "18px",
                  background: opt.bg,
                  color: opt.color,
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "14px",
                    background: opt.logoBg,
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: opt.logoBg === "transparent" ? "2px solid rgba(255,255,255,.6)" : undefined,
                  }}
                >
                  <Image
                    src={opt.logo}
                    alt=""
                    width={60}
                    height={60}
                    style={{ width: "100%", height: "100%", objectFit: opt.logoFit }}
                  />
                </span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontWeight: 800, fontSize: "19px" }}>{opt.title}</span>
                  {opt.sub && <span style={{ fontWeight: 700, fontSize: "14px" }}>{opt.sub}</span>}
                </span>
                <span style={{ fontSize: "22px", fontWeight: 800 }} aria-hidden>
                  →
                </span>
              </a>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              textAlign: "center",
              alignItems: "center",
              paddingTop: "32px",
              borderTop: "1px solid rgba(244,241,234,.1)",
            }}
          >
            <span style={{ width: "40px", height: "3px", background: "#e7b84e", borderRadius: "2px" }} />
            <p
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "26px",
                lineHeight: 1.08,
                textWrap: "balance",
              }}
            >
              God loveth a cheerful giver.
            </p>
            <p
              style={{
                color: "#aab3c5",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              2 Corinthians 9:7
            </p>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
