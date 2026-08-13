import { authenticatedFetch, getApiUrl } from "./apiUrl";

function invoicePdfFilename(invoiceNumber: string) {
  const safe = String(invoiceNumber || "invoice").replace(/[^a-z0-9-_]/gi, "_");
  return `${safe || "invoice"}.pdf`;
}

async function responseError(response: Response) {
  const payload = await response.clone().json().catch(() => null);
  return payload?.error || `Invoice PDF download failed (${response.status})`;
}

export async function downloadStoredInvoicePdf(invoiceId: string, invoiceNumber: string) {
  const response = await authenticatedFetch(getApiUrl(`/invoices/${encodeURIComponent(invoiceId)}/pdf`), {
    method: "GET",
    suppressNativeErrorAlert: true,
  });
  if (!response.ok) throw new Error(await responseError(response));

  const pdf = await response.blob();
  const signature = new TextDecoder().decode((await pdf.slice(0, 5).arrayBuffer()));
  if (pdf.size === 0 || signature !== "%PDF-") throw new Error("The downloaded invoice is not a valid PDF");

  const objectUrl = URL.createObjectURL(pdf);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = invoicePdfFilename(invoiceNumber);
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
}

export const invoicePdfDownloadInternals = { invoicePdfFilename };
