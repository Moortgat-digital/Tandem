"use client";

import { createContext, useContext } from "react";
import type { Tenant } from "@/types/tandem";

const TenantContext = createContext<Tenant | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: Tenant;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): Tenant {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant() must be used inside <TenantProvider>");
  }
  return ctx;
}
