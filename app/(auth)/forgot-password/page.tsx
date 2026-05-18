import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Forgot your password?</h2>
        <p className="text-sm text-muted-foreground">
          No worries. Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form className="space-y-4">
        <div className="space-y-2 group">
          <label className="text-sm font-medium leading-none text-foreground/80 group-focus-within:text-primary transition-colors" htmlFor="email">
            Email address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@widpai.com"
            className="bg-background/50 border-border/50 hover:border-primary/40 focus:border-primary transition-all"
            required
          />
        </div>

        <Button className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300" type="submit">
          Send Reset Link
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to login
        </Link>
      </div>
    </div>
  );
}
