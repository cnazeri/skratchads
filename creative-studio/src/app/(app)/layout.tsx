export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div id="main-content">{children}</div>;
}
