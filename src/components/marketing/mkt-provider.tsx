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
  updateEngagement: (id: string, status: MktContact["engagementStatus"]) => void;
  passToSales: (id: string) => void;
  addContact: (data: Partial<MktContact>) => void;
  addCampaign: (data: Partial<MktCampaign>) => void;
}

const MktContext = createContext<MktContextValue | null>(null);

export function MktProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<MktContact[]>([]);
  const [campaigns, setCampaigns] = useState<MktCampaign[]>([]);
  const [notifications, setNotifications] = useState<MktNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/marketing/contacts").then(r => r.json()),
      fetch("/api/marketing/campaigns").then(r => r.json()),
    ]).then(([c, camp]) => {
      setContacts(c);
      setCampaigns(camp);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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
    setContacts(prev => prev.map(c => c.id === id
      ? { ...c, readyForSales: true, passedToSalesAt: ts }
      : c
    ));
    const contact = contacts.find(c => c.id === id);
    if (contact) {
      setNotifications(prev => [...prev, {
        id: `n${ts}`, text: `${contact.name} enviado a pipeline de ventas`, time: ts,
      }]);
    }
    fetch(`/api/marketing/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ready_for_sales: 1, passed_to_sales_at: ts }),
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

  return (
    <MktContext.Provider value={{ contacts, campaigns, notifications, loading, updateEngagement, passToSales, addContact, addCampaign }}>
      {children}
    </MktContext.Provider>
  );
}

export function useMkt() {
  const ctx = useContext(MktContext);
  if (!ctx) throw new Error("useMkt must be used inside MktProvider");
  return ctx;
}
