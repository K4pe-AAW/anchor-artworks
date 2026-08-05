"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type Step = "credentials" | "totp";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCredentialsSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    setStep("totp");
  }

  async function handleTotpSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      email,
      password,
      totpCode,
      redirect: false,
    });
    setIsSubmitting(false);

    if (!result || result.error) {
      setError("認証に失敗しました。メールアドレス・パスワード・認証コードを確認してください。");
      setTotpCode("");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (step === "totp") {
    return (
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleTotpSubmit}>
            <div className="space-y-2">
              <Label htmlFor="totpCode">多要素認証コード</Label>
              <Input
                id="totpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                認証アプリ（Google Authenticator等）に表示されている6桁のコードを入力してください
              </p>
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep("credentials");
                  setTotpCode("");
                  setError(null);
                }}
              >
                戻る
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting || totpCode.length !== 6}>
                {isSubmitting ? "確認中…" : "ログイン"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full">
            次へ
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
