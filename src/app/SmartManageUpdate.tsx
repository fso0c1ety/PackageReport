"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import SystemUpdateAltRounded from "@mui/icons-material/SystemUpdateAltRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import packageJson from "../../package.json";
import * as updatePolicy from "../../server/services/appUpdatePolicy";
import type { PlatformPolicy, UpdateType } from "../../server/services/appUpdatePolicy";
import { getApiUrl, isElectronRuntime } from "./apiUrl";

type Platform = "windows" | "android" | "ios" | "web";
type Manifest = {
  windows: PlatformPolicy;
  android: PlatformPolicy;
  ios: PlatformPolicy;
  web: PlatformPolicy & { buildId: string };
};
type DisplayState = "available" | "downloading" | "ready" | "failed";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const DISMISS_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CURRENT_BUILD_ID = process.env.NEXT_PUBLIC_SMART_MANAGE_BUILD_ID || packageJson.version;

function platform(): Platform {
  if (isElectronRuntime()) return "windows";
  if (Capacitor.isNativePlatform()) {
    const native = Capacitor.getPlatform();
    if (native === "android" || native === "ios") return native;
  }
  return "web";
}

function dismissalKey(target: string) {
  return `smart-manage:update-dismissed:${target}`;
}

function wasDismissed(target: string) {
  try {
    const dismissedAt = Number(localStorage.getItem(dismissalKey(target)) || 0);
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_INTERVAL_MS;
  } catch {
    return false;
  }
}

function titleFor(type: UpdateType, state: DisplayState) {
  if (state === "downloading") return "Downloading Smart Manage update";
  if (state === "ready") return "Update ready";
  if (state === "failed") return "Update failed";
  if (type === "REQUIRED") return "Update required";
  return "Smart Manage update available";
}

export default function SmartManageUpdate() {
  const activePlatform = useMemo(platform, []);
  const [policy, setPolicy] = useState<PlatformPolicy | null>(null);
  const [updateType, setUpdateType] = useState<UpdateType>("OPTIONAL");
  const [displayState, setDisplayState] = useState<DisplayState>("available");
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [latestWebBuildId, setLatestWebBuildId] = useState("");
  const failureCount = useRef(0);

  const targetVersion = activePlatform === "web" ? latestWebBuildId : String(policy?.latestVersion || "");
  const required = updateType === "REQUIRED";

  const check = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl("app-version"), { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Update service returned ${response.status}`);
      const manifest = (await response.json()) as Manifest;
      const nextPolicy = manifest[activePlatform];
      if (!nextPolicy) return;
      failureCount.current = 0;
      setPolicy(nextPolicy);

      if (activePlatform === "web") {
        const changed = Boolean(manifest.web.buildId && manifest.web.buildId !== CURRENT_BUILD_ID);
        setLatestWebBuildId(String(manifest.web.buildId || ""));
        if (changed && !wasDismissed(manifest.web.buildId)) {
          setUpdateType("OPTIONAL");
          setVisible(true);
        }
        return;
      }

      const result = updatePolicy.evaluateUpdate(packageJson.version, nextPolicy);
      if (result.invalid || (!result.available && !result.required)) return;
      const nextType = result.required ? "REQUIRED" : result.updateType || "OPTIONAL";
      setUpdateType(nextType);
      if (result.required || !wasDismissed(nextPolicy.latestVersion)) setVisible(true);
    } catch {
      failureCount.current += 1;
      // Offline/update-service failures never block a previously supported app.
    }
  }, [activePlatform]);

  useEffect(() => {
    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [check]);

  useEffect(() => {
    if (!window.smartManageUpdater) return;
    const unsubscribe = window.smartManageUpdater.onState((event) => {
      const state = String(event.state || "");
      if (state === "available") {
        setPolicy((current) => ({ ...(current || {} as PlatformPolicy), latestVersion: String(event.version || current?.latestVersion || "") }));
        setVisible(true);
        setDisplayState("available");
      } else if (state === "downloading") {
        setDisplayState("downloading");
        setProgress(Math.max(0, Math.min(100, Number(event.percent) || 0)));
        setVisible(true);
      } else if (state === "ready") {
        setDisplayState("ready");
        setVisible(true);
      } else if (state === "error") {
        setDisplayState("failed");
        setVisible(true);
      }
    });
    void window.smartManageUpdater.check().catch(() => undefined);
    return unsubscribe;
  }, []);

  const dismiss = () => {
    if (required) return;
    try { localStorage.setItem(dismissalKey(targetVersion), String(Date.now())); } catch {}
    setVisible(false);
  };

  const update = async () => {
    if (activePlatform === "web") {
      window.location.reload();
      return;
    }
    if (activePlatform === "windows" && window.smartManageUpdater) {
      try {
        if (displayState === "ready") await window.smartManageUpdater.install();
        else {
          setDisplayState("downloading");
          await window.smartManageUpdater.download();
        }
      } catch {
        setDisplayState("failed");
      }
      return;
    }
    if (policy?.storeUrl) {
      const opened = window.open(policy.storeUrl, "_blank", "noopener,noreferrer");
      if (!opened) setDisplayState("failed");
    } else {
      setDisplayState("failed");
    }
  };

  if (!visible || !policy) return null;

  const versionLabel = activePlatform === "web"
    ? "Smart Manage has been updated. Refresh to use the latest version."
    : `Version ${policy.latestVersion} is available.`;
  const message = displayState === "failed"
    ? activePlatform === "android" || activePlatform === "ios"
      ? "The official store listing is not configured or could not be opened. You can continue using Smart Manage."
      : "The update could not be completed. Check your connection and try again."
    : required
      ? "This version of Smart Manage is no longer supported. Update to continue."
      : updateType === "RECOMMENDED"
        ? "A new Smart Manage version is available. We recommend updating."
        : versionLabel;

  return (
    <Box
      role={required ? "alertdialog" : "status"}
      aria-live="polite"
      sx={{ position: "fixed", inset: required ? 0 : "auto 20px 20px auto", zIndex: 1600, display: "flex", alignItems: required ? "center" : "flex-end", justifyContent: required ? "center" : "flex-end", bgcolor: required ? "rgba(15,23,42,.58)" : "transparent", width: required ? "100%" : { xs: "calc(100% - 24px)", sm: "auto" }, right: required ? 0 : { xs: 12, sm: 20 }, bottom: required ? 0 : { xs: "calc(76px + env(safe-area-inset-bottom))", sm: 20 } }}
    >
      <Paper elevation={16} sx={{ width: { xs: "100%", sm: 390 }, borderRadius: 4, p: 2.5, border: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: "grid", placeItems: "center", color: "white", bgcolor: required ? "error.main" : "primary.main", flex: "0 0 auto" }}>
            {displayState === "downloading" ? <CircularProgress color="inherit" size={22} /> : activePlatform === "web" ? <RefreshRounded /> : <SystemUpdateAltRounded />}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={900}>{titleFor(updateType, displayState)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{displayState === "ready" ? "Restart Smart Manage to finish installing the new version." : message}</Typography>
          </Box>
        </Stack>
        {displayState === "downloading" && <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, borderRadius: 99 }} />}
        {policy.releaseNotes?.length > 0 && displayState === "available" && (
          <Box component="ul" sx={{ my: 1.5, pl: 2.5, color: "text.secondary", fontSize: 13 }}>
            {policy.releaseNotes.slice(0, 4).map((note) => <li key={note}>{note}</li>)}
          </Box>
        )}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          {!required && displayState !== "ready" && <Button onClick={dismiss} color="inherit">Later</Button>}
          {displayState === "failed" && <Button onClick={() => { setDisplayState("available"); void check(); }} variant="outlined">Retry</Button>}
          {displayState !== "failed" && <Button onClick={update} variant="contained">{activePlatform === "web" ? "Refresh" : displayState === "ready" ? "Restart & Update" : required ? "Update Smart Manage" : "Update Now"}</Button>}
        </Stack>
      </Paper>
    </Box>
  );
}
