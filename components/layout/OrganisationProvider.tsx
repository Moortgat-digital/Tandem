"use client";

import { createContext, useContext } from "react";
import type { Organisation } from "@/types/tandem";

const OrganisationContext = createContext<Organisation | null>(null);

export function OrganisationProvider({
  organisation,
  children,
}: {
  organisation: Organisation;
  children: React.ReactNode;
}) {
  return (
    <OrganisationContext.Provider value={organisation}>
      {children}
    </OrganisationContext.Provider>
  );
}

export function useOrganisation(): Organisation {
  const ctx = useContext(OrganisationContext);
  if (!ctx) {
    throw new Error("useOrganisation() must be used inside <OrganisationProvider>");
  }
  return ctx;
}
