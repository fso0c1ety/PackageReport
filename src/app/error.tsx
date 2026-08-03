"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("smart_manage_frontend_error", { message: error.message, digest: error.digest }); }, [error]);
  return <main role="alert" style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}><div style={{ maxWidth: 520, textAlign: "center" }}><img src="/icon.png" alt="Smart Manage" width="56" height="56" /><h1>Something went wrong</h1><p>The error was recorded. Your saved workspace data has not been changed.</p><button onClick={reset} style={{ padding: "12px 20px", borderRadius: 10, border: 0, background: "#5b4df5", color: "white", fontWeight: 700 }}>Try again</button></div></main>;
}
