import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
            A
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Anchor Art Works Admin</h1>
          <p className="text-sm text-muted-foreground">運営者専用の管理システムです</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
