"use client";

import React from "react";
import { Capacitor } from "@capacitor/core";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import UpdateIcon from "@mui/icons-material/Update";
import { getServerUrl, isElectronRuntime } from "./apiUrl";

type BuildInfo = {
  version?: string;
  buildCommit?: string;
  buildDate?: string;
  minimumVersion?: string;
  forceUpdate?: boolean;
  message?: string;
  releaseNotesUrl?: string;
  downloads?: {
    desktop?: string;
    android?: string;
    ios?: string;
    web?: string;
  };
};

function parseVersion(version?: string) {
  return String(version || "0")
    .split(/[^\d]+/)
    .filter(Boolean)
    .map((part) => Number(part));
}

function compareVersions(a?: string, b?: string) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const max = Math.max(left.length, right.length);

  for (let i = 0; i < max; i += 1) {
    const l = left[i] || 0;
    const r = right[i] || 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }

  return 0;
}

function buildFingerprint(info?: BuildInfo | null) {
  return [info?.version, info?.buildCommit, info?.buildDate].filter(Boolean).join("|");
}

async function readBuildInfo(url: string): Promise<BuildInfo | null> {
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function getPlatformKey(): "desktop" | "android" | "ios" | "web" {
  if (isElectronRuntime()) return "desktop";

  try {
    const platform = Capacitor.getPlatform?.();
    if (platform === "android" || platform === "ios") {
      return platform;
    }
  } catch {
    // Ignore and fall back to web.
  }

  return "web";
}

export default function AppUpdateNotifier() {
  const [open, setOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [remoteInfo, setRemoteInfo] = React.useState<BuildInfo | null>(null);
  const [localInfo, setLocalInfo] = React.useState<BuildInfo | null>(null);
  const platform = React.useMemo(() => getPlatformKey(), []);

  const checkForUpdates = React.useCallback(async () => {
    const remoteBase = getServerUrl().replace(/\/$/, "");
    if (!remoteBase || typeof window === "undefined") return;

    const [currentBuild, latestBuild] = await Promise.all([
      readBuildInfo("/build-info.json"),
      readBuildInfo(`${remoteBase}/build-info.json`),
    ]);

    setLocalInfo(currentBuild);

    if (!latestBuild) return;

    const localVersion = currentBuild?.version || "0.1.0";
    const remoteVersion = latestBuild.version || localVersion;
    const localFingerprint = buildFingerprint(currentBuild);
    const remoteFingerprint = buildFingerprint(latestBuild);
    const hasPlatformLink = !!(
      latestBuild.downloads?.[platform] ||
      latestBuild.downloads?.web ||
      latestBuild.releaseNotesUrl
    );

    if (!hasPlatformLink || !remoteFingerprint) return;

    const versionBehind = compareVersions(localVersion, remoteVersion) < 0;
    const buildChanged = !!localFingerprint && localFingerprint !== remoteFingerprint;
    const minVersionRequired = latestBuild.minimumVersion
      ? compareVersions(localVersion, latestBuild.minimumVersion) < 0
      : false;

    const dismissedKey = `smartmanage:update:dismissed:${remoteFingerprint}`;
    const alreadyDismissed = window.localStorage.getItem(dismissedKey) === "1";

    if ((versionBehind || buildChanged || minVersionRequired || latestBuild.forceUpdate) && (!alreadyDismissed || latestBuild.forceUpdate || minVersionRequired)) {
      setRemoteInfo(latestBuild);
      setOpen(true);
    }
  }, [platform]);

  React.useEffect(() => {
    checkForUpdates();

    const handleFocus = () => {
      checkForUpdates();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(checkForUpdates, 15 * 60 * 1000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [checkForUpdates]);

  const handleClose = () => {
    if (remoteInfo?.forceUpdate || typeof window === "undefined") return;

    const fingerprint = buildFingerprint(remoteInfo);
    if (fingerprint) {
      window.localStorage.setItem(`smartmanage:update:dismissed:${fingerprint}`, "1");
    }
    setOpen(false);
  };

  const handleUpdate = () => {
    if (typeof window === "undefined") return;

    const targetUrl =
      remoteInfo?.downloads?.[platform] ||
      remoteInfo?.downloads?.web ||
      remoteInfo?.releaseNotesUrl ||
      getServerUrl();

    if (!targetUrl) return;

    setIsUpdating(true);

    const isNativePlatform = platform === "android" || platform === "ios";
    const hostedBase = getServerUrl().replace(/\/$/, "");
    const shouldUpdateInPlace =
      isNativePlatform ||
      isElectronRuntime() ||
      targetUrl.replace(/\/$/, "") === hostedBase;

    if (!remoteInfo?.forceUpdate) {
      setOpen(false);
    }

    if (shouldUpdateInPlace) {
      window.location.assign(targetUrl);
      return;
    }

    const openedWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (!openedWindow) {
      window.location.href = targetUrl;
    }
  };

  const actionLabel =
    platform === "android"
      ? "Update APK"
      : platform === "ios"
        ? "Open iPhone Update"
        : platform === "desktop"
          ? "Update Desktop App"
          : "Open Latest Version";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={!!remoteInfo?.forceUpdate}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, fontWeight: 800 }}>
        <SystemUpdateAltIcon color="primary" />
        Update available
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>
            {remoteInfo?.message || "A newer build of SMART MANAGE is ready. Update now to keep the app in sync."}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Installed: ${localInfo?.version || "0.1.0"}`} size="small" variant="outlined" />
            <Chip label={`Latest: ${remoteInfo?.version || localInfo?.version || "0.1.0"}`} size="small" color="primary" />
          </Stack>

          {remoteInfo?.buildDate && (
            <Box sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
              Release built: {new Date(remoteInfo.buildDate).toLocaleString()}
            </Box>
          )}

          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
            {platform === "ios"
              ? "Tap update to switch to the newest hosted iPhone/iPad build flow immediately."
              : platform === "android"
                ? "Tap update to switch to the newest hosted Android build flow immediately."
                : platform === "desktop"
                  ? "Tap update to reload into the latest desktop build or installer flow."
                  : "Open the latest version in your browser."}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {!remoteInfo?.forceUpdate && (
          <Button onClick={handleClose} sx={{ textTransform: "none", fontWeight: 700 }}>
            Later
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleUpdate}
          startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : <UpdateIcon />}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          {isUpdating ? "Updating..." : actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
