import { useGetSiteSettings } from "@workspace/api-client-react";

export function useSiteIdentity() {
  const { data } = useGetSiteSettings();
  const site = (data?.settings as Record<string, { siteName?: string; logoUrl?: string }> | undefined)?.site;
  return {
    siteName: site?.siteName || "Programming Poth",
    logoUrl: site?.logoUrl || "",
  };
}
