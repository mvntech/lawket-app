// mobile: layout.tsx intercepts /settings root and shows the nav list,
// so this page component is never rendered on mobile.
//
// desktop: the fixed overlay shows children in <main>. Render a subtle
// prompt so the content area isn't blank on first entry to /settings.
export default function SettingsPage() {
  return (
    <div className="hidden md:flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Select a section from the sidebar.
      </p>
    </div>
  )
}
