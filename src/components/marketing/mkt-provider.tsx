"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { MktContact, MktCampaign } from "./mkt-types";

interface MktNotification {
  id: string;
  text: string;
  time: number;
}

interface MktContextValue {
  contacts: MktContact[];
  campaigns: MktCampaign[];
  notifications: MktNotification[];
  loading: boolean;
  syncing: boolean;
  updateEngagement: (id: string, status: MktContact["engagementStatus"]) => void;
  passToSales: (id: string) => void;
  addContact: (data: Partial<MktContact>) => void;
  addCampaign: (data: Partial<MktCampaign>) => void;
  recalculateScores: () => Promise<void>;
  syncFromBrevo: () => Promise<{ synced: number; total: number }>;
  refresh: () => void;
}

const MktContext = createContext<MktContextValue | null>(null);

export function MktProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<MktContact[]>([]);
  const [campaigns, setCampaigns] = useState<MktCampaign[]>([]);
  const [notifications, setNotifications] = useState<MktNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function mergeContacts(mkt: MktContact[], sales: any[]): MktContact[] {
    const seen = new Set(mkt.map(c => c.email?.toLowerCase()).filter(Boolean));
    const extra: MktContact[] = sales
      .filter(r => r.email && !seen.has(r.email.toLowerCase()))
      .map(r => ({
        id: r.id, name: r.name, company: r.company ?? "", email: r.email ?? "",
        phone: r.phone ?? "", source: r.source ?? "", tier: 0,
        temperature: r.temperature ?? "cold", score: r.score ?? 0,
        brevoCadence: "", engagementStatus: "cold" as const,
        emailOpens: 0, emailClicks: 0, leadSourceDetail: "", marketingNotes: "",
        readyForSales: false, passedToSalesAt: null, industry: "", lastActivity: 0,
        linkedinUrl: "", brevoId: "", jobTitle: "", companySize: "", location: "",
        emailVerified: false, emailBounced: false, emailUnsubscribed: false,
      }));
    return [...mkt, ...extra];
  }

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/marketing/contacts").then(r => r.json()),
      fetch("/api/marketing/campaigns").then(r => r.json()),
      fetch("/api/contacts").then(r => r.json()).catch(() => []),
    ]).then(([c, camp, sales]) => {
      const mkt = Array.isArray(c) ? c : [];
      setContacts(mergeContacts(mkt, Array.isArray(sales) ? sales : []));
      setCampaigns(Array.isArray(camp) ? camp : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateEngagement = useCallback((id: string, status: MktContact["engagementStatus"]) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, engagementStatus: status } : c));
    fetch(`/api/marketing/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engagement_status: status }),
    });
  }, []);

  const passToSales = useCallback((id: string) => {
    const ts = Date.now();
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    setContacts(prev => prev.map(c => c.id === id
      ? { ...c, readyForSales: true, passedToSalesAt: ts }
      : c
    ));

    setNotifications(prev => [...prev, {
      id: `n${ts}`, text: `${contact.name} enviado a pipeline de ventas`, time: ts,
    }]);

    // Mark in marketing DB
    fetch(`/api/marketing/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ready_for_sales: 1, passed_to_sales_at: ts }),
    });

    // Create real deal in sales pipeline
    fetch("/api/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contact.name,
        company: contact.company,
        email: contact.email,
        phone: contact.phone,
        industry: contact.industry,
        tier: contact.tier,
        score: contact.score,
        marketingNotes: contact.marketingNotes,
        source: "marketing_handoff",
      }),
    });
  }, [contacts]);

  const addContact = useCallback((data: Partial<MktContact>) => {
    fetch("/api/marketing/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()).then((newContact: MktContact) => {
      setContacts(prev => [newContact, ...prev]);
    });
  }, []);

  const addCampaign = useCallback((data: Partial<MktCampaign>) => {
    fetch("/api/marketing/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()).then((newCampaign: MktCampaign) => {
      setCampaigns(prev => [newCampaign, ...prev]);
    });
  }, []);

  const recalculateScores = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch("/api/brevo/recalculate-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushToBrevo: true }),
      });
      const [updated, sales] = await Promise.all([
        fetch("/api/marketing/contacts").then(r => r.json()),
        fetch("/api/contacts").then(r => r.json()).catch(() => []),
      ]);
      setContacts(mergeContacts(Array.isArray(updated) ? updated : [], Array.isArray(sales) ? sales : []));
    } finally {
      setSyncing(false);
    }
  }, []);

  const syncFromBrevo = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/brevo/sync", { method: "POST" });
      const data = await res.json();
      const [updated, sales] = await Promise.all([
        fetch("/api/marketing/contacts").then(r => r.json()),
        fetch("/api/contacts").then(r => r.json()).catch(() => []),
      ]);
      setContacts(mergeContacts(Array.isArray(updated) ? updated : [], Array.isArray(sales) ? sales : []));
      return { synced: data.synced || 0, total: data.total || 0 };
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <MktContext.Provider value={{
      contacts, campaigns, notifications, loading, syncing,
      updateEngagement, passToSales, addContact, addCampaign,
      recalculateScores, syncFromBrevo, refresh: loadData,
    }}>
      {children}
    </MktContext.Provider>
  );
}

export function useMkt() {
  const ctx = useContext(MktContext);
  if (!ctx) throw new Error("useMkt must be used inside MktProvider");
  return ctx;
}
