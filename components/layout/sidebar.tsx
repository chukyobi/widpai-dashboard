import Link from "next/link"
import { BarChart3, MessageSquare, Shield, LogOut, CreditCard, FileText } from "lucide-react"
import { logoutAction } from "@/app/(auth)/actions"

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full w-60 flex-col glass border-r shadow-xl relative z-10 flex-shrink-0">
        <div className="flex h-14 items-center px-5 border-b border-border/50 bg-background/30">
          <Shield className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent truncate">
            Widpai Hub
          </span>
        </div>

        <div className="flex-1 overflow-auto py-4">
          <div className="px-4 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Menu</div>
          <nav className="grid gap-0.5 px-2 text-sm font-medium">
            <Link href="/rates" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              Exchange Rates
            </Link>
            <Link href="/conversations" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95">
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              Conversations
            </Link>
            <Link href="/transactions" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95">
              <FileText className="h-4 w-4 flex-shrink-0" />
              Transactions
            </Link>
            <Link href="/payment-methods" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95">
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              Payment Methods
            </Link>
          </nav>
        </div>

        <div className="p-3 border-t border-border/50">
          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95">
              <LogOut className="h-4 w-4 flex-shrink-0" />
              Logout
            </button>
          </form>
        </div>
      </div>

      {/* Mobile bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/50 bg-card/80 backdrop-blur-xl py-2">
        <Link href="/rates" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-muted-foreground hover:text-primary transition-colors active:scale-95">
          <BarChart3 className="h-5 w-5" />
          <span className="text-[10px] font-medium">Rates</span>
        </Link>
        <Link href="/conversations" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-muted-foreground hover:text-primary transition-colors active:scale-95">
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium">Chats</span>
        </Link>
        <Link href="/transactions" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-muted-foreground hover:text-primary transition-colors active:scale-95">
          <FileText className="h-5 w-5" />
          <span className="text-[10px] font-medium">Txns</span>
        </Link>
        <Link href="/payment-methods" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-muted-foreground hover:text-primary transition-colors active:scale-95">
          <CreditCard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Payments</span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-muted-foreground hover:text-destructive transition-colors active:scale-95">
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </form>
      </nav>
    </>
  )
}
