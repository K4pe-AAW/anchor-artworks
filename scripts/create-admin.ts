/**
 * 実運用の管理者アカウントを対話的に作成する。
 * パスワードは画面には表示せず、ターミナルへ直接入力する（チャット等には貼り付けないこと）。
 * 実行: npm run create-admin
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import qrcode from "qrcode";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { encryptTotpSecret, generateTotpSecret, totpKeyUri } from "../src/lib/totp";

const db = new PrismaClient();

const ENTER_CODES = new Set([10, 13]); // \n, \r
const BACKSPACE_CODES = new Set([8, 127]); // \b, DEL
const CTRL_C_CODE = 3;
const CTRL_D_CODE = 4;

/**
 * Node標準のraw modeでパスワード入力を隠す（外部stty依存なし）。
 * TTYとして認識できない環境（IDE内蔵ターミナル等）では、隠せない旨を警告した上で通常入力にフォールバックする。
 */
function readHidden(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      console.log(
        "\n⚠ このターミナルでは入力を非表示にできません（TTYとして検出されませんでした）。" +
          "入力した文字がそのまま画面に表示されます。可能であればmacOSの「ターミナル」アプリで直接実行してください。\n",
      );
      const rl = createInterface({ input: stdin, output: process.stdout });
      rl.question(promptText).then((answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    process.stdout.write(promptText);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let input = "";
    const finish = (value: string) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      resolve(value.trim());
    };

    const onData = (chunk: string) => {
      const code = chunk.charCodeAt(0);
      if (chunk.length === 1 && (ENTER_CODES.has(code) || code === CTRL_D_CODE)) {
        finish(input);
        return;
      }
      if (chunk.length === 1 && code === CTRL_C_CODE) {
        stdin.setRawMode(false);
        process.stdout.write("\n");
        process.exit(1);
      }
      if (chunk.length === 1 && BACKSPACE_CODES.has(code)) {
        input = input.slice(0, -1);
        return;
      }
      input += chunk;
    };

    stdin.on("data", onData);
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
