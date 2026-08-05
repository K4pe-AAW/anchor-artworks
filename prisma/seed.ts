/**
 * 開発環境専用のダミーデータ投入スクリプト。
 * 本番の個人情報は一切含めない。実行: npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptTotpSecret, generateTotpSecret, totpKeyUri } from "../src/lib/totp";

const db = new PrismaClient();

async function main() {
  // --- 管理者（ローカル開発専用。パスワードは.env.exampleのDEV_SEED_ADMIN_PASSWORDを参照） ---
  const passwordHash = await bcrypt.hash(
    process.env.DEV_SEED_ADMIN_PASSWORD ?? "change-me-in-dev-only",
    12,
  );
  const totpSecret = generateTotpSecret();
  const owner = await db.administrator.upsert({
    where: { email: "owner@anchor-japan.com" },
    update: {
      passwordHash,
      totpSecretEncrypted: encryptTotpSecret(totpSecret),
      mfaEnabledAt: new Date(),
      isActive: true,
    },
    create: {
      email: "owner@anchor-japan.com",
      displayName: "管理者（開発用）",
      passwordHash,
      totpSecretEncrypted: encryptTotpSecret(totpSecret),
      mfaEnabledAt: new Date(),
      role: "OWNER",
      isActive: true,
    },
  });

  // --- サービス ---
  const pdcCleaner = await db.service.upsert({
    where: { slug: "pdc-cleaner" },
    update: {},
    create: {
      slug: "pdc-cleaner",
      name: "PDC Cleaner",
      publicUrl: "https://pdc.anchor-japan.com",
      status: "OPERATIONAL",
      lastSyncedAt: new Date(),
    },
  });

  const sampleService = await db.service.upsert({
    where: { slug: "sample-service" },
    update: {},
    create: {
      slug: "sample-service",
      name: "（サンプル）今後追加予定のサービス",
      publicUrl: "https://example.com",
      status: "UNKNOWN",
      lastSyncError: "内部連携が未設定です",
    },
  });

  // --- サービス連携状態 ---
  await db.serviceIntegration.createMany({
    data: [
      { serviceId: pdcCleaner.id, kind: "STRIPE", isConfigured: true, maskedValueHint: "...4242", lastStatus: "OK", lastCheckedAt: new Date() },
      { serviceId: pdcCleaner.id, kind: "PAYPAL", isConfigured: true, maskedValueHint: "...9F2C", lastStatus: "OK", lastCheckedAt: new Date() },
      { serviceId: pdcCleaner.id, kind: "SMTP", isConfigured: true, maskedValueHint: "...smtp", lastStatus: "OK", lastCheckedAt: new Date() },
      { serviceId: pdcCleaner.id, kind: "INTERNAL_API", isConfigured: false, lastStatus: "UNKNOWN" },
    ],
    skipDuplicates: true,
  });

  // --- 利用者スナップショット ---
  const users = [
    { externalUserId: "u_001", emailMasked: "y.***@gmail.com", currentPlan: "pro", contractStatus: "active", monthUsage: 42.5, provider: "stripe" },
    { externalUserId: "u_002", emailMasked: "k.***@yahoo.co.jp", currentPlan: "personal", contractStatus: "active", monthUsage: 5.2, provider: "paypal" },
    { externalUserId: "u_003", emailMasked: "s.***@icloud.com", currentPlan: "free", contractStatus: "active", monthUsage: 0.3, provider: null },
    { externalUserId: "u_004", emailMasked: "m.***@outlook.jp", currentPlan: "pro", contractStatus: "past_due", monthUsage: 12.0, provider: "stripe" },
    { externalUserId: "u_005", emailMasked: "t.***@gmail.com", currentPlan: "personal", contractStatus: "canceled", monthUsage: 0, provider: "stripe" },
  ];

  for (const u of users) {
    const snapshot = await db.serviceUserSnapshot.upsert({
      where: { serviceId_externalUserId: { serviceId: pdcCleaner.id, externalUserId: u.externalUserId } },
      update: {},
      create: {
        serviceId: pdcCleaner.id,
        externalUserId: u.externalUserId,
        emailMasked: u.emailMasked,
        currentPlan: u.currentPlan,
        contractStatus: u.contractStatus,
        registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
        lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        currentMonthUsage: u.monthUsage,
        paymentProvider: u.provider,
      },
    });

    if (u.currentPlan !== "free" && u.currentPlan !== "trial") {
      // 再実行時に契約履歴が積み上がらないよう、投入前に一旦クリアする。
      await db.subscriptionSnapshot.deleteMany({ where: { serviceUserSnapshotId: snapshot.id } });
      await db.subscriptionSnapshot.create({
        data: {
          serviceId: pdcCleaner.id,
          serviceUserSnapshotId: snapshot.id,
          plan: u.currentPlan,
          status: u.contractStatus,
          paymentProvider: u.provider ?? "stripe",
          currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
        },
      });
    }
  }

  // --- 売上（Stripe/PayPal共通形式） ---
  const transactions = [
    { provider: "STRIPE" as const, id: "pi_3P0001", plan: "pro", gross: 2980, fee: 116, refund: 0, email: "y.***@gmail.com" },
    { provider: "STRIPE" as const, id: "pi_3P0002", plan: "personal", gross: 980, fee: 48, refund: 0, email: "k.***@yahoo.co.jp" },
    { provider: "PAYPAL" as const, id: "PAY-0001", plan: "pro", gross: 2980, fee: 145, refund: 0, email: "m.***@outlook.jp" },
    { provider: "STRIPE" as const, id: "pi_3P0003", plan: "personal", gross: 980, fee: 48, refund: 980, email: "t.***@gmail.com" },
  ];

  for (const t of transactions) {
    await db.paymentTransaction.upsert({
      where: { provider_externalPaymentId: { provider: t.provider, externalPaymentId: t.id } },
      update: {},
      create: {
        serviceId: pdcCleaner.id,
        provider: t.provider,
        externalPaymentId: t.id,
        emailMasked: t.email,
        plan: t.plan,
        grossAmount: t.gross,
        feeAmount: t.fee,
        refundAmount: t.refund,
        netAmount: t.gross - t.fee - t.refund,
        currency: "jpy",
        status: t.refund > 0 ? "refunded" : "succeeded",
        occurredAt: new Date(),
        rawResponse: { note: "開発用ダミーデータ（原本APIレスポンスの代わり）" },
      },
    });
  }

  const periodKey = new Date().toISOString().slice(0, 7);
  // 開発シードは再実行可能にするため、当月分は毎回作り直す。
  await db.revenueSnapshot.deleteMany({ where: { serviceId: pdcCleaner.id, periodKey } });
  await db.revenueSnapshot.createMany({
    data: [
        {
          serviceId: pdcCleaner.id,
          periodKey,
          provider: null,
          grossRevenue: 7920,
          feeTotal: 357,
          refundTotal: 980,
          netRevenue: 6583,
          mrr: 5940,
          newContracts: 2,
          canceledContracts: 1,
        },
        {
          serviceId: pdcCleaner.id,
          periodKey,
          provider: "STRIPE",
          grossRevenue: 4940,
          feeTotal: 212,
          refundTotal: 980,
          netRevenue: 3748,
          mrr: 2960,
          newContracts: 1,
          canceledContracts: 1,
        },
        {
          serviceId: pdcCleaner.id,
          periodKey,
          provider: "PAYPAL",
          grossRevenue: 2980,
          feeTotal: 145,
          refundTotal: 0,
          netRevenue: 2835,
          mrr: 2980,
          newContracts: 1,
          canceledContracts: 0,
        },
    ],
  });

  // --- 過去5ヶ月分の売上推移（概要画面のグラフ用ダミーデータ、再実行時は作り直す） ---
  const historicalNet = [4820, 5210, 5460, 5980, 6210];
  for (let i = historicalNet.length; i >= 1; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const net = historicalNet[historicalNet.length - i];
    await db.revenueSnapshot.deleteMany({
      where: { serviceId: pdcCleaner.id, periodKey: key, provider: null },
    });
    await db.revenueSnapshot.create({
      data: {
        serviceId: pdcCleaner.id,
        periodKey: key,
        provider: null,
        grossRevenue: Math.round(net * 1.2),
        feeTotal: Math.round(net * 0.05),
        refundTotal: 0,
        netRevenue: net,
        mrr: Math.round(net * 0.9),
        newContracts: 1,
        canceledContracts: 0,
      },
    });
  }

  // --- Webhook監視 ---
  await db.webhookEvent.upsert({
    where: { serviceId_provider: { serviceId: pdcCleaner.id, provider: "STRIPE" } },
    update: {},
    create: { serviceId: pdcCleaner.id, provider: "STRIPE", lastReceivedAt: new Date(), failureCount: 0 },
  });
  await db.webhookEvent.upsert({
    where: { serviceId_provider: { serviceId: pdcCleaner.id, provider: "PAYPAL" } },
    update: {},
    create: {
      serviceId: pdcCleaner.id,
      provider: "PAYPAL",
      lastReceivedAt: new Date(Date.now() - 1000 * 60 * 90),
      failureCount: 2,
      lastFailureAt: new Date(Date.now() - 1000 * 60 * 30),
      lastFailureReason: "署名検証エラー",
    },
  });

  // --- ジョブ実行履歴（再実行時の積み上がり防止） ---
  await db.jobRun.deleteMany({ where: { serviceId: pdcCleaner.id } });
  await db.jobRun.createMany({
    data: [
      { serviceId: pdcCleaner.id, jobName: "purge_expired_results", status: "SUCCESS", startedAt: new Date(Date.now() - 1000 * 60 * 60), finishedAt: new Date(Date.now() - 1000 * 60 * 59) },
      { serviceId: pdcCleaner.id, jobName: "backup-worker", status: "SUCCESS", startedAt: new Date(Date.now() - 1000 * 60 * 60 * 20), finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 20 + 60000) },
      { serviceId: pdcCleaner.id, jobName: "retention-worker", status: "FAILURE", startedAt: new Date(Date.now() - 1000 * 60 * 30), finishedAt: new Date(Date.now() - 1000 * 60 * 29), detail: "接続タイムアウト" },
    ],
  });

  // --- お知らせ・配信履歴（再実行時の積み上がり防止） ---
  const sampleTitle = "定期メンテナンスのお知らせ（開発用サンプル）";
  await db.announcement.deleteMany({ where: { title: sampleTitle } });
  const announcement = await db.announcement.create({
    data: {
      title: sampleTitle,
      body: "サンプル本文です。",
      category: "CRITICAL",
      status: "SENT",
      createdById: owner.id,
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  });
  await db.notificationDelivery.create({
    data: {
      announcementId: announcement.id,
      channel: "EMAIL",
      targetCount: 128,
      successCount: 126,
      failureCount: 2,
      openCount: 84,
      status: "COMPLETED",
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 5),
    },
  });

  // --- コンテンツチャンネル（Podcast/YouTube/Instagram/TikTok） ---
  // 数値はAPI連携ではなく手動記録のため、開発用のダミー履歴のみを投入する。
  const contentChannels: {
    platform: "PODCAST_SPOTIFY" | "YOUTUBE" | "INSTAGRAM" | "TIKTOK";
    name: string;
    handle: string | null;
    publicUrl: string;
    base: { followers: number; views: number };
  }[] = [
    {
      platform: "PODCAST_SPOTIFY",
      name: "Anchor Art Works Podcast",
      handle: null,
      publicUrl: "https://creators.spotify.com/home/show/3LB5V1KiFTgJHKhwaURoVG",
      base: { followers: 320, views: 480 },
    },
    {
      platform: "YOUTUBE" as const,
      name: "Anchor Art Works",
      handle: null,
      publicUrl: "https://studio.youtube.com/channel/UCUYphaAVDPA1XO4ybUajrCQ",
      base: { followers: 1450, views: 2100 },
    },
    {
      platform: "INSTAGRAM" as const,
      name: "（要設定）Instagram",
      handle: null,
      publicUrl: "https://www.instagram.com/",
      base: { followers: 890, views: 1200 },
    },
    {
      platform: "TIKTOK" as const,
      name: "（要設定）TikTok",
      handle: null,
      publicUrl: "https://www.tiktok.com/",
      base: { followers: 210, views: 3400 },
    },
  ];

  for (const c of contentChannels) {
    const existingChannel = await db.contentChannel.findFirst({
      where: { platform: c.platform, handle: c.handle },
    });
    const channel =
      existingChannel ??
      (await db.contentChannel.create({
        data: {
          platform: c.platform,
          name: c.name,
          handle: c.handle,
          publicUrl: c.publicUrl,
        },
      }));

    // 再実行時に履歴が積み上がらないよう、開発用ダミー履歴は作り直す。
    await db.contentChannelSnapshot.deleteMany({ where: { channelId: channel.id } });
    const weeks = 8;
    const snapshotRows = Array.from({ length: weeks }, (_, i) => {
      const weeksAgo = weeks - 1 - i;
      const capturedAt = new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
      const growth = 1 + (weeks - weeksAgo) * 0.03;
      return {
        channelId: channel.id,
        capturedAt,
        followers: Math.round(c.base.followers * growth),
        periodViews: Math.round(c.base.views * (0.85 + Math.random() * 0.3)),
        periodLikes: Math.round(c.base.views * 0.1),
        recordedById: owner.id,
      };
    });
    await db.contentChannelSnapshot.createMany({ data: snapshotRows });
  }

  // --- 監査ログサンプル ---
  await db.adminAuditLog.create({
    data: {
      administratorId: owner.id,
      action: "seed.dummy_data.created",
      targetType: "system",
      detail: { note: "開発用シードデータを投入しました" },
    },
  });

  console.log("シード完了:", { owner: owner.email, services: [pdcCleaner.name, sampleService.name] });
  console.log("");
  console.log("--- ローカル開発用ログイン情報（本番では絶対に使わないこと） ---");
  console.log("メールアドレス:", owner.email);
  console.log("パスワード:", process.env.DEV_SEED_ADMIN_PASSWORD ?? "change-me-in-dev-only");
  console.log("TOTPシークレット（認証アプリに手動入力する場合）:", totpSecret);
  console.log("otpauth URL（QRコード生成用）:", totpKeyUri(totpSecret, owner.email));
  console.log("---------------------------------------------------------------");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
