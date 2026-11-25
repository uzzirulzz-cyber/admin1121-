"use client";

import { useEffect, useState } from "react";
import Storefront from "@/components/storefront/Storefront";
import AdminApp from "@/components/admin/AdminApp";

export default function Home() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const onHash = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0 });
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (hash.startsWith("#/admin")) {
    return <AdminApp />;
  }

  return <Storefront />;
}
