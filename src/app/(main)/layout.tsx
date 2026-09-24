import { BottomNav, SiteHeader } from "@/components/site-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pt-8 pb-28 md:pt-12 md:pb-16">{children}</main>
      <BottomNav />
    </>
  );
}
