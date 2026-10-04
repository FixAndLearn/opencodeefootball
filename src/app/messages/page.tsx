"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Conversation {
  id: string;
  kind: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id, conversations(id, kind)")
        .eq("user_id", user.id);

      const convos = (memberships ?? [])
        .map((m) => (Array.isArray(m.conversations) ? m.conversations[0] : m.conversations))
        .filter((c): c is Conversation => Boolean(c));
      setConversations(convos);
      if (convos[0]) setActiveId(convos[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const supabase = createClient();
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeId)
      .order("created_at")
      .then(({ data }) => setMessages(data ?? []));

    const channel = supabase
      .channel(`conversation:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeId || !userId) return;
    const supabase = createClient();
    await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: userId,
      kind: "text",
      body: draft.trim(),
    });
    setDraft("");
  }

  return (
    <main className="mx-auto flex h-[80vh] max-w-5xl gap-4 px-4 py-8">
      <aside className="w-64 shrink-0 rounded-xl border p-3">
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Conversations</h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-neutral-400">No conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                c.id === activeId ? "bg-brand-50" : "hover:bg-neutral-50"
              }`}
            >
              {c.kind} conversation
            </button>
          ))
        )}
      </aside>

      <section className="flex flex-1 flex-col rounded-xl border">
        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-neutral-400">No messages.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                  m.sender_id === userId
                    ? "ml-auto bg-brand-600 text-white"
                    : "bg-neutral-100"
                }`}
              >
                {m.body}
              </div>
            ))
          )}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border px-3 py-2"
          />
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-white">Send</button>
        </form>
      </section>
    </main>
  );
}
