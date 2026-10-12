export function parsePortalContextResponse(data, requestedPortalType) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { error: "Përgjigjja e portalit është e pavlefshme. Provoni përsëri." };
  }
  if (!data.active || typeof data.active !== "object" || Array.isArray(data.active)) {
    return { error: "Nuk u gjet konteksti i portalit për këtë llogari." };
  }
  if (data.active.portalType !== requestedPortalType) {
    return { error: "Ky portal nuk është i caktuar për llogarinë tuaj." };
  }
  const readiness = data.active.portalReadiness;
  if (!readiness || !["READY", "PARTIAL"].includes(readiness.status)) {
    return { error: `${readiness?.label || "Ky portal"} nuk është ende i disponueshëm. ${readiness?.reason || "Zgjidhni një portal tjetër."}` };
  }
  return { membership: data.active };
}
