import AdminNav from "@/components/AdminNav";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
