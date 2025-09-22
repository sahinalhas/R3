import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ClassHoursPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/settings?tab=class-hours", { replace: true });
  }, [setLocation]);
  return null;
}
