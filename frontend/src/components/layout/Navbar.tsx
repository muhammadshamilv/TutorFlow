import { useAtomValue } from "jotai";
import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

import { UserMenu } from "@/components/layout/UserMenu";
import { paths } from "@/routes/paths";
import { currentUserAtom } from "@/store/auth";

export function Navbar() {
  const currentUser = useAtomValue(currentUserAtom);

  const homePath = currentUser?.role === "tutor" ? paths.tutorHome : paths.studentHome;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to={homePath} className="flex items-center gap-2 font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </div>
          <span>TutorFlow</span>
        </Link>

        {currentUser && <UserMenu user={currentUser} />}
      </div>
    </header>
  );
}