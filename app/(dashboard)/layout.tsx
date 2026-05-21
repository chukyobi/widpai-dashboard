import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0 relative">
        {children}
      </main>
    </div>
  );
}
