/**
 * 実運用の管理者アカウントを対話的に作成する。
 * パスワードは画面には表示せず、ターミナルへ直接入力する（チャット等には貼り付けないこと）。
 * 実行: npm run create-admin
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { execSync } from "node:child_process";
import qrcode from "qrcode";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { encryptTotpSecret, generateTotpSecret, totpKeyUri } from "../src/lib/totp";

const db = new PrismaClient();

const ENTER_CODES = new Set([10, 13]); // \n, \r
const BACKSPACE_CODES = new Set([8, 127]); // \b, DEL
const CTRL_C_CODE = 3;
const CTRL_D_CODE = 4;

function readHidden(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(promptText);
    try {
      execSync("stty -echo");
    } catch {
      // stty が使えない環境（非TTY等）では通常入力にフォールバック
    }

    const restoreEcho = () => {
      try {
        execSync("stty echo");
      } catch {
        // noop
      }
    };

    let input = "";
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (chunk: string) => {
      const code = chunk.charCodeAt(0);
      if (chunk.length === 1 && ENTER_CODES.has(code)) {
        process.stdin.removeListener("data", onData);
        restoreEcho();
        process.stdout.write("\n");
        process.stdin.pause();
        resolve(input.trim());
        return;
      }
      if (chunk.length === 1 && code === CTRL_D_CODE) {
        process.stdin.removeListener("data", onData);
        restoreEcho();
        process.stdout.write("\n");
        process.stdin.pause();
        resolve(input.trim());
        return;
      }
      if (chunk.length === 1 && code === CTRL_C_CODE) {
        restoreEcho();
        process.stdout.write("\n");
        process.exit(1);
      }
      if (chunk.length === 1 && BACKSPACE_CODES.has(code)) {
        input = input.slice(0, -1);
        return;
      }
      input += chunk;
    };

    process.stdin.on("data", onData);
  });
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = (await rl.question("メールアドレス: ")).trim();
  const displayName = (await rl.question("表示名: ")).trim();
  rl.close();

  if (!email || !displayName) {
    console.error("メールアドレス・表示名は必須です");
    process.exit(1);
  }

  const password = await readHidden("パスワード（12文字以上推奨、画面には表示されません）: ");
  const password2 = await readHidden("パスワード（確認）: ");
  if (password !== password2) {
    console.error("パスワードが一致しません");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("パスワードは12文字以上にしてください");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const totpSecret = generateTotpSecret();
  const uri = totpKeyUri(totpSecret, email);

  const admin = await db.administrator.upsert({
    where: { email },
    update: {
      displayName,
      passwordHash,
      totpSecretEncrypted: encryptTotpSecret(totpSecret),
      mfaEnabledAt: new Date(),
      isActive: true,
    },
    create: {
      email,
      displayName,
      passwordHash,
      totpSecretEncrypted: encryptTotpSecret(totpSecret),
      mfaEnabledAt: new Date(),
      role: "OWNER",
      isActive: true,
    },
  });

  console.log(`\n作成/更新しました: ${admin.email}（${admin.role}）\n`);
  console.log("認証アプリ（Google Authenticator / 1Password等）で以下のQRコードを読み取ってください:\n");
  const qr = await qrcode.toString(uri, { type: "terminal", small: true });
  console.log(qr);
  console.log(`読み取れない場合はこのURLを直接使ってください（他人と共有しないこと）:\n${uri}\n`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
