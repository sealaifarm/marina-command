// Page titles shown in the top bar. Add new pages here.
const pageTitles = [
  { href: "/spaces/marina-map", title: "Marina Map" },
  { href: "/spaces/dockwalks", title: "Dockwalks" },
  { href: "/leads", title: "Leads" },
  { href: "/storage", title: "Storage" },
];

export function getPageTitle(pathname: string) {
  if (pathname === "/") return "Home";
  const match = pageTitles.find(
    (page) => pathname === page.href || pathname.startsWith(`${page.href}/`)
  );
  return match?.title ?? "Marina Command";
}
