"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { tandemChannelName, targetKey } from "@/lib/realtime-collab";
import type {
  RealtimeCellEvent,
  RealtimePresenceMeta,
  RealtimeTarget,
} from "@/types/tandem";

type LockEntry = { userId: string; firstName: string };
type ContentListener = (content: string, updatedAt: string) => void;

type TandemRealtimeApi = {
  me: RealtimePresenceMeta;
  presence: RealtimePresenceMeta[];
  locks: Map<string, LockEntry>;
  focus: (target: RealtimeTarget) => void;
  blur: (target: RealtimeTarget) => void;
  broadcastContent: (target: RealtimeTarget, content: string) => void;
  registerContentListener: (
    target: RealtimeTarget,
    fn: ContentListener
  ) => () => void;
  registerForceBlur: (target: RealtimeTarget, fn: () => void) => () => void;
};

const Ctx = createContext<TandemRealtimeApi | null>(null);

export function useTandemRealtime(): TandemRealtimeApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useTandemRealtime must be used inside <TandemRealtimeProvider>"
    );
  }
  return ctx;
}

export function useTargetLock(target: RealtimeTarget): LockEntry | undefined {
  const { locks } = useTandemRealtime();
  return locks.get(targetKey(target));
}

export function TandemRealtimeProvider({
  pairId,
  me,
  children,
}: {
  pairId: string;
  me: RealtimePresenceMeta;
  children: React.ReactNode;
}) {
  const [presence, setPresence] = useState<RealtimePresenceMeta[]>([]);
  const [locks, setLocks] = useState<Map<string, LockEntry>>(() => new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const myFocusRef = useRef<Set<string>>(new Set());
  const contentListenersRef = useRef<Map<string, Set<ContentListener>>>(
    new Map()
  );
  const forceBlurRef = useRef<Map<string, Set<() => void>>>(new Map());
  const meRef = useRef(me);
  meRef.current = me;

  useEffect(() => {
    const client = createClient();
    const channel = client.channel(tandemChannelName(pairId), {
      config: {
        broadcast: { self: false },
        presence: { key: me.userId },
      },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "tandem" }, ({ payload }) => {
      const evt = payload as RealtimeCellEvent;
      if (evt.userId === meRef.current.userId) return;
      const key = targetKey(evt.target);

      if (evt.type === "focus") {
        setLocks((prev) => {
          const next = new Map(prev);
          next.set(key, { userId: evt.userId, firstName: evt.userFirstName });
          return next;
        });
        // Si je suis aussi focus sur cette cible et que mon userId est plus
        // grand (tie-break déterministe), je cède.
        if (
          myFocusRef.current.has(key) &&
          evt.userId < meRef.current.userId
        ) {
          forceBlurRef.current.get(key)?.forEach((fn) => fn());
        }
      } else if (evt.type === "blur") {
        setLocks((prev) => {
          const cur = prev.get(key);
          if (!cur || cur.userId !== evt.userId) return prev;
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } else if (evt.type === "content_update") {
        contentListenersRef.current
          .get(key)
          ?.forEach((fn) => fn(evt.content, evt.updatedAt));
      }
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<RealtimePresenceMeta>();
      const others: RealtimePresenceMeta[] = [];
      const seen = new Set<string>();
      for (const metas of Object.values(state)) {
        for (const meta of metas) {
          if (meta.userId === meRef.current.userId) continue;
          if (seen.has(meta.userId)) continue;
          seen.add(meta.userId);
          others.push(meta);
        }
      }
      setPresence(others);
    });

    channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
      const leftIds = new Set<string>(
        leftPresences.map((p) => (p as unknown as RealtimePresenceMeta).userId)
      );
      setLocks((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [k, v] of next.entries()) {
          if (leftIds.has(v.userId)) {
            next.delete(k);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({
          userId: meRef.current.userId,
          firstName: meRef.current.firstName,
          role: meRef.current.role,
        } satisfies RealtimePresenceMeta);
      }
    });

    return () => {
      void channel.untrack();
      void client.removeChannel(channel);
      channelRef.current = null;
    };
  }, [pairId, me.userId]);

  const focus = useCallback((target: RealtimeTarget) => {
    const key = targetKey(target);
    myFocusRef.current.add(key);
    void channelRef.current?.send({
      type: "broadcast",
      event: "tandem",
      payload: {
        type: "focus",
        userId: meRef.current.userId,
        userFirstName: meRef.current.firstName,
        target,
      } satisfies RealtimeCellEvent,
    });
  }, []);

  const blur = useCallback((target: RealtimeTarget) => {
    const key = targetKey(target);
    myFocusRef.current.delete(key);
    void channelRef.current?.send({
      type: "broadcast",
      event: "tandem",
      payload: {
        type: "blur",
        userId: meRef.current.userId,
        target,
      } satisfies RealtimeCellEvent,
    });
  }, []);

  const broadcastContent = useCallback(
    (target: RealtimeTarget, content: string) => {
      void channelRef.current?.send({
        type: "broadcast",
        event: "tandem",
        payload: {
          type: "content_update",
          userId: meRef.current.userId,
          target,
          content,
          updatedAt: new Date().toISOString(),
        } satisfies RealtimeCellEvent,
      });
    },
    []
  );

  const registerContentListener = useCallback(
    (target: RealtimeTarget, fn: ContentListener) => {
      const key = targetKey(target);
      const map = contentListenersRef.current;
      const set = map.get(key) ?? new Set<ContentListener>();
      set.add(fn);
      map.set(key, set);
      return () => {
        set.delete(fn);
        if (set.size === 0) map.delete(key);
      };
    },
    []
  );

  const registerForceBlur = useCallback(
    (target: RealtimeTarget, fn: () => void) => {
      const key = targetKey(target);
      const map = forceBlurRef.current;
      const set = map.get(key) ?? new Set<() => void>();
      set.add(fn);
      map.set(key, set);
      return () => {
        set.delete(fn);
        if (set.size === 0) map.delete(key);
      };
    },
    []
  );

  const api = useMemo<TandemRealtimeApi>(
    () => ({
      me,
      presence,
      locks,
      focus,
      blur,
      broadcastContent,
      registerContentListener,
      registerForceBlur,
    }),
    [
      me,
      presence,
      locks,
      focus,
      blur,
      broadcastContent,
      registerContentListener,
      registerForceBlur,
    ]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
