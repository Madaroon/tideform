import AuthProvider from "@/components/ui/AuthProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
