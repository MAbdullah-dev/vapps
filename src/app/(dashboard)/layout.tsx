export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div>Sidebar + Topbar</div>
      {children}
    </div>
  );
}

