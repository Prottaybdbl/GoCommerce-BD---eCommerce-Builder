import { config } from "../config.js";
import { formatOrderToSteadfastCsvRow, SteadfastCsvRow } from "@gocom/contracts";

export interface CreateSteadfastParcelParams {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number; // in BDT
  note?: string;
  apiKey?: string;
  secretKey?: string;
}

export interface SteadfastApiResponse {
  status: number;
  message: string;
  consignment?: {
    consignment_id: number;
    invoice: string;
    tracking_code: string;
    status: string;
  };
}

export class SteadfastCourierService {
  /**
   * Book parcel via official Steadfast API
   */
  static async createParcel(params: CreateSteadfastParcelParams): Promise<SteadfastApiResponse> {
    const apiKey = params.apiKey;
    const secretKey = params.secretKey;

    if (!apiKey || !secretKey) {
      throw new Error("Steadfast credentials not configured for store. Each merchant must provide their own Steadfast API credentials.");
    }

    const payload = {
      invoice: params.invoice,
      recipient_name: params.recipientName,
      recipient_phone: params.recipientPhone.replace(/^\+88/, ""),
      recipient_address: params.recipientAddress,
      cod_amount: params.codAmount,
      note: params.note || "Please call customer before delivery",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(`${config.STEADFAST_BASE_URL}/create_order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Steadfast API error (${response.status}): ${errText}`);
      }

      return (await response.json()) as SteadfastApiResponse;
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Steadfast API request timed out after 15 seconds.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Neutralize spreadsheet formula injection (CSV injection).
   * If a cell begins with '=', '+', '-', '@', tab (\t), or carriage return (\r),
   * prepend a single quote (') so spreadsheet engines treat it strictly as literal text.
   */
  static sanitizeCsvField(value: unknown): string {
    if (value === null || value === undefined) return '""';
    let str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }

  /**
   * Generates Steadfast bulk import CSV content with formula neutralization
   */
  static generateBulkCsv(orders: Parameters<typeof formatOrderToSteadfastCsvRow>[0][]): string {
    const headers = ["Invoice", "Name", "Address", "Phone", "Amount", "Note"];
    const rows = orders.map((o) => {
      const formatted = formatOrderToSteadfastCsvRow(o);
      return [
        SteadfastCourierService.sanitizeCsvField(formatted.Invoice),
        SteadfastCourierService.sanitizeCsvField(formatted.Name),
        SteadfastCourierService.sanitizeCsvField(formatted.Address),
        SteadfastCourierService.sanitizeCsvField(formatted.Phone),
        formatted.Amount,
        SteadfastCourierService.sanitizeCsvField(formatted.Note || ""),
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\r\n");
  }
}
