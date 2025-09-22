import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SchoolInfoPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/settings?tab=school-info", { replace: true });
  }, [setLocation]);
  return null;
}
