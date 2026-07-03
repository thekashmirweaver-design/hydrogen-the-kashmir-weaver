import { useEffect } from "react";
import {useLocation} from "react-router";

export function ScrollToTop() {
  const pathname = useLocation().pathname;

  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
