import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseFilters } from "@/lib/filters";
import { listPaymentTransactions } from "@/server/revenue";
import { recordAuditLog } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";

const HEADERS = [
  "日時",
  "サービス",
  "決済会社",
  "利用者",
  "プラン",
  "総額",
  "手数料",
  "返金額",
  "純額",
  "通貨",
  "支払い状態",
  "外部決済ID",
];

function toCsvRow(values: (string | number)[]): string {
  return values
    .map((value) => {
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(",");
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.expired) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseFilters(searchParams);
  const transactions = await listPaymentTransactions(filters, searchParams.q);

  const rows = [
    HEADERS,
    ...transactions.map((t) => [
      formatDateTime(t.occurredAt),
      t.service.name,
      t.provider,
      t.emailMasked,
      t.plan ?? "",
      t.grossAmount,
      t.feeAmount,
      t.refundAmount,
      t.netAmount,
      t.currency,
      t.status,
      t.externalPaymentId,
    ]),
  ];
  const csv = "﻿" + rows.map(toCsvRow).join("\n");

  await recordAuditLog({
    administratorId: session.user.id,
    action: "revenue.csv_export",
    detail: { period: filters.period, count: transactions.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenue_${filters.period}.csv"`,
    },
  });
}
