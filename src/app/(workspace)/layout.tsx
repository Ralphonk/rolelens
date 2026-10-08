import { MatcherWorkspace } from "@/components/matcher-workspace";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <MatcherWorkspace />
      {children}
    </>
  );
}
