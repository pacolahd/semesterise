import { IconPackage } from "@tabler/icons-react";

import { ThemeSwitcher } from "@/components/theme-switcher";

export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center space-x-20 text-center text-2xl font-semibold">
      <p>Welcome to Semesterise</p>
      <IconPackage />
      <ThemeSwitcher />
    </div>
  );
}
