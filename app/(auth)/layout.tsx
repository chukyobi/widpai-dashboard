export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      {/* Dynamic Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-accent/20 blur-3xl animate-pulse delay-700 -z-10" />
      
      <div className="w-full max-w-md animate-in glass-card rounded-2xl p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Widpai Admin</h1>
          <p className="text-sm text-muted-foreground mt-2">Trading Hub Management Portal</p>
        </div>
        {children}
      </div>
    </div>
  );
}
