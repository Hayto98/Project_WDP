import { useEffect, useState } from "react";

export function useHashRoute(fallback = "overview") {
  const read = () => window.location.hash.replace(/^#/, "") || fallback;
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return route;
}
