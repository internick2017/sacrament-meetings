export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <p className="rounded bg-amber-50 px-4 py-2 text-sm text-amber-800">
        Admin area. Authentication is scaffolded in Week 05.
      </p>
      {children}
    </div>
  );
}
