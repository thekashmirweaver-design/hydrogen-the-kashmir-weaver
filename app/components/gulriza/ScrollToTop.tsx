import { useLayoutEffect } from "react";
import {useLocation} from "react-router";
import {resetScrollLock} from "~/lib/scroll-lock";

export function ScrollToTop() {
  const pathname = useLocation().pathname;

  useLayoutEffect(() => {
    resetScrollLock();
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
