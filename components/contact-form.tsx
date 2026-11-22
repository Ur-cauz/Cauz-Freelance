"use client";

import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "success" | "error";
type Field = "name" | "email" | "service" | "message";
type Errors = Partial<Record<Field, string>>;

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function validate(data: FormData): Errors {
  const errors: Errors = {};
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const service = String(data.get("service") ?? "");
  const message = String(data.get("message") ?? "").trim();
  if (!name) errors.name = "Tell me your name.";
  if (!EMAIL.test(email)) errors.email = "Enter an email I can reply to.";
  if (!service) errors.service = "Pick the closest option.";
  if (message.length < 10) errors.message = "A sentence or two, at least 10 characters.";
  return errors;
}

const input =
  "mt-1.5 block w-full rounded border border-line-strong bg-inset px-3 py-2.5 text-base text-fg placeholder:text-faint " +
  "transition-colors focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] aria-[invalid=true]:border-danger";

export function ContactForm({ services, email }: { services: string[]; email: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const startedAt = useRef(0);
  const statusRef = useRef<HTMLParagraphElement>(null);

  // Set once per fresh form (mount, or "send another"), not on retries,
  // so a quick retry after an error is not mistaken for a bot.
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Deep link from /lab: /?topic=hosting&source=lab#contact preselects the hosting topic.
  const serviceRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("topic");
    const wanted = topic === "hosting" ? "Hosting on Cauz Lab" : null;
    if (wanted && serviceRef.current && services.includes(wanted)) serviceRef.current.value = wanted;
  }, [services]);

  function reset() {
    startedAt.current = Date.now();
    setStatus("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const found = validate(data);
    setErrors(found);
    const first = (Object.keys(found) as Field[])[0];
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name")).trim(),
          email: String(data.get("email")).trim(),
          service: String(data.get("service")),
          message: String(data.get("message")).trim(),
          website: String(data.get("website") ?? ""),
          startedAt: startedAt.current,
          ...(TURNSTILE_SITE_KEY ? { turnstileToken: String(data.get("cf-turnstile-response") ?? "") } : {})
        })
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not send right now.");
      form.reset();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not send right now.");
      requestAnimationFrame(() => statusRef.current?.focus());
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="border-l-4 border-l-run pl-4">
        <p className="text-2xl font-bold tracking-tight">Got it, thanks.</p>
        <p className="mt-2 text-muted">I’ll reply to the email you gave, usually with a few questions or a time to talk.</p>
        <button type="button" onClick={reset} className="link mt-6 text-sm font-medium">
          Send another message
        </button>
      </div>
    );
  }

  const describe = (field: Field) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {});
  const errorText = (field: Field) =>
    errors[field] ? (
      <span id={`${field}-error`} className="mt-1.5 block text-sm text-danger">
        {errors[field]}
      </span>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6" aria-busy={status === "sending"}>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="eng-label">Name</span>
          <input name="name" autoComplete="name" maxLength={100} required className={input} {...describe("name")} />
          {errorText("name")}
        </label>
        <label className="block">
          <span className="eng-label">Email</span>
          <input name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} required className={input} {...describe("email")} />
          {errorText("email")}
        </label>
      </div>

      <label className="block">
        <span className="eng-label">What do you need?</span>
        <select ref={serviceRef} name="service" defaultValue="" required className={`${input} cursor-pointer`} {...describe("service")}>
          <option value="" disabled>
            Choose one
          </option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
        {errorText("service")}
      </label>

      <label className="block">
        <span className="eng-label">Project details</span>
        <textarea
          name="message"
          rows={5}
          minLength={10}
          maxLength={4000}
          required
          placeholder="What are you building, who is it for, and is there a deadline?"
          className={`${input} resize-y`}
          {...describe("message")}
        />
        {errorText("message")}
      </label>

      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {TURNSTILE_SITE_KEY ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="auto" />
        </>
      ) : null}

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={status === "sending"} className="btn-primary w-full sm:w-auto">
          {status === "sending" ? (
            <>
              <span className="spinner" aria-hidden="true" /> Sending…
            </>
          ) : (
            <>
              Send enquiry <span aria-hidden="true">→</span>
            </>
          )}
        </button>
        <p className="text-sm text-muted">
          Or email <a className="link text-fg" href={`mailto:${email}`}>{email}</a>
        </p>
      </div>

      <p ref={statusRef} tabIndex={-1} role="alert" className="text-sm text-danger empty:hidden focus:outline-none">
        {status === "error" ? message : ""}
      </p>
    </form>
  );
}
