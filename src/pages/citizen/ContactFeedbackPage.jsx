import React, { useMemo, useState } from "react";
import { FileText, PhoneCall, ShieldAlert, Star, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { cn } from "../../lib/utils";

function StarRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background transition",
              "hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            title={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "h-5 w-5",
                active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              )}
            />
          </button>
        );
      })}
      <span className="ml-2 text-xs text-muted-foreground">{value}/5</span>
    </div>
  );
}

export default function ContactFeedbackPage() {
  const data = useMemo(
    () => ({
      support: {
        hours: "Sun–Fri • 10:00–17:00",
        hotline: "01-5186354",
        whatsappDigits: "9779847221589",
        email: "support@yourdomain.com",
      },
      emergency: {
        ambulance: "102",
        police: "100",
        fire: "101",
        bloodBank: "01-6611661",
        rescue: "1149",
      },
    }),
    []
  );

  const [form, setForm] = useState({ subject: "", message: "", rating: 5 });
  const [sentMsg, setSentMsg] = useState("");

  const validWhatsApp = /^\d+$/.test(data.support.whatsappDigits || "");
  const disabled =
    String(form.subject || "").trim().length < 3 || String(form.message || "").trim().length < 5;

  function buildFeedbackText() {
    return [
      `Subject: ${form.subject || "-"}`,
      `Rating: ${form.rating}/5`,
      "",
      "Message:",
      form.message || "-",
      "",
      "— Sent from Smart Waste App (Citizen)",
    ].join("\n");
  }

  function buildMailto() {
    const subject = `[Feedback] ${form.subject || "Citizen Feedback"} (Rating: ${form.rating}/5)`;
    const body = ["Hello Smart Waste Team,", "", buildFeedbackText()].join("\n");
    return `mailto:${encodeURIComponent(data.support.email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  function buildWhatsAppLink() {
    const text = `Hello Smart Waste Team,\n\n${buildFeedbackText()}`;
    return `https://wa.me/${data.support.whatsappDigits}?text=${encodeURIComponent(text)}`;
  }

  function thankYou(channel) {
    setSentMsg(
      `Thank you for your feedback! Sent via ${channel}.\n\nSmart Waste Support:\nHotline: ${data.support.hotline}\nWhatsApp: +${data.support.whatsappDigits}\nEmail: ${data.support.email}`
    );
  }

  function clearMessage() {
    setForm((s) => ({ ...s, message: "" }));
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Inline keyframes (no separate CSS needed) */}
      <style>{`
        @keyframes emergencyBorderPulse {
          0%, 100% {
            border-color: rgba(239, 68, 68, 0.35);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.00);
          }
          50% {
            border-color: rgba(239, 68, 68, 0.95);
            box-shadow: 0 0 0 7px rgba(239, 68, 68, 0.18);
          }
        }
        .emergency-blink {
          animation: emergencyBorderPulse 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .emergency-blink {
            animation: none !important;
          }
        }
      `}</style>

      <div>
        <h1 className="text-xl font-semibold">Contact & Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Get support, view emergency numbers, and send feedback via Email or WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Support */}
        <Card className="rounded-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
              <div className="text-base font-semibold">Smart Waste Support</div>
            </div>
            <div className="text-sm text-muted-foreground">{data.support.hours}</div>
          </CardHeader>

          <CardContent className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href={`tel:${data.support.hotline.replace(/\s+/g, "")}`}
                className="rounded-2xl border border-border bg-background p-4 hover:bg-muted/40 transition"
              >
                <div className="text-xs text-muted-foreground">Hotline</div>
                <div className="mt-1 font-semibold">{data.support.hotline}</div>
              </a>

              <a
                href={validWhatsApp ? `https://wa.me/${data.support.whatsappDigits}` : undefined}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-border bg-background p-4 hover:bg-muted/40 transition"
              >
                <div className="text-xs text-muted-foreground">WhatsApp</div>
                <div className="mt-1 font-semibold">+{data.support.whatsappDigits}</div>
              </a>

              <a
                href={`mailto:${data.support.email}`}
                className="rounded-2xl border border-border bg-background p-4 hover:bg-muted/40 transition sm:col-span-2"
              >
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="mt-1 font-semibold">{data.support.email}</div>
              </a>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Use Smart Waste Support for: missed pickup, overflow, bulky pickup, complaints.
            </div>
          </CardContent>
        </Card>

        {/* Emergency */}
        <Card className="rounded-2xl border-red-200 dark:border-red-900/40 emergency-blink">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <div className="text-base font-semibold text-red-700 dark:text-red-300">
                Emergency Numbers  [24/7]
              </div>
            </div>
            <div className="text-sm text-red-700/70 dark:text-red-300/70">
              Use these for immediate emergencies.
            </div>
          </CardHeader>

          <CardContent className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Ambulance", data.emergency.ambulance],
                ["Police", data.emergency.police],
                ["Fire Brigade", data.emergency.fire],
                ["Blood Bank", data.emergency.bloodBank],
              ].map(([label, value]) => (
                <a
                  key={label}
                  href={`tel:${String(value).replace(/\s+/g, "")}`}
                  className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-4 hover:bg-red-50 transition"
                >
                  <div className="text-xs text-red-700/70 dark:text-red-300/70">{label}</div>
                  <div className="mt-1 font-semibold text-red-800 dark:text-red-200">{value}</div>
                </a>
              ))}

              <a
                href={`tel:${String(data.emergency.rescue).replace(/\s+/g, "")}`}
                className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-4 hover:bg-red-50 transition sm:col-span-2"
              >
                <div className="text-xs text-red-700/70 dark:text-red-300/70">Disaster / Rescue</div>
                <div className="mt-1 font-semibold text-red-800 dark:text-red-200">
                  {data.emergency.rescue}
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback */}
      <Card className="rounded-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="text-base font-semibold">Send Feedback</div>
          </div>
          <div className="text-sm text-muted-foreground">
            Feedback is sent via Email or WhatsApp 
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {sentMsg ? (
            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap">
              {sentMsg}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                placeholder="e.g., missed pickup, app issue, suggestion"
              />
            </div>

            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRating
                value={form.rating}
                onChange={(rating) => setForm((s) => ({ ...s, rating }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Message</Label>

                {/* Clear message: no underline, no Y-axis move on hover */}
                <button
                  type="button"
                  onClick={clearMessage}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  title="Clear message"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>

              <textarea
                className="w-full min-h-[130px] rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={form.message}
                onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                placeholder="Please provide us you feedback"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={disabled}
              onClick={() => {
                thankYou("Email");
                window.location.href = buildMailto();
              }}
            >
              Send via Email
            </Button>

            <Button
              variant="secondary"
              disabled={disabled || !validWhatsApp}
              onClick={() => {
                thankYou("WhatsApp");
                window.open(buildWhatsAppLink(), "_blank", "noopener,noreferrer");
              }}
            >
              Send via WhatsApp
            </Button>

            <span className="text-xs text-muted-foreground">
              Minimum: subject 3+ chars, message 5+ chars
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
