export type StorageProvider = "supabase" | "asyncstorage" | "sqlite";

export const STORAGE_DEPS: Record<StorageProvider, string> = {
    supabase: "@supabase/supabase-js react-native-url-polyfill expo-sqlite --legacy-peer-deps",
    asyncstorage: "@react-native-async-storage/async-storage --legacy-peer-deps",
    sqlite: "expo-sqlite --legacy-peer-deps",
};

export function storageConfigTemplate(provider: StorageProvider,
    supabaseUrl?: string,
    supabasePublishableKey?: string): string {
    switch (provider) {
        case "supabase":
            return `import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js'
import 'expo-sqlite/localStorage/install';

const SUPABASE_URL = "${supabaseUrl ?? "https://YOUR_PROJECT.supabase.co"}";
const SUPABASE_PUBLISHABLE_KEY = "${supabasePublishableKey ?? "YOUR_PUBLISHABLE_KEY"}";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})
`;

        case "asyncstorage":
            return `import AsyncStorage from "@react-native-async-storage/async-storage";

export async function storeItem(key: string, value: unknown): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getItem<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
}

export async function removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
}
`;

        case "sqlite":
            return `import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("app.db");

export function initDatabase(): void {
    db.execSync(\`
        CREATE TABLE IF NOT EXISTS items (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            key   TEXT    NOT NULL UNIQUE,
            value TEXT    NOT NULL
        );
    \`);
}
`;
    }
}

export function storageHookTemplate(provider: StorageProvider): string {
    switch (provider) {
        case "supabase":
            return `import { useState, useEffect } from "react";
import { supabase } from "../storage/config";

export function useSupabase<T extends Record<string, unknown>>(table: string) {
    const [data,    setData]    = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    async function fetchAll() {
        setLoading(true);
        const { data: rows, error: err } = await supabase.from(table).select("*");
        if (err) setError(err.message);
        else     setData((rows ?? []) as T[]);
        setLoading(false);
    }

    async function insert(item: T) {
        const { error: err } = await supabase.from(table).insert(item as never);
        if (err) setError(err.message);
        else     await fetchAll();
    }

    async function update(id: number | string, changes: Partial<T>) {
        const { error: err } = await supabase.from(table).update(changes as never).eq("id", id);
        if (err) setError(err.message);
        else     await fetchAll();
    }

    async function remove(id: number | string) {
        const { error: err } = await supabase.from(table).delete().eq("id", id);
        if (err) setError(err.message);
        else     await fetchAll();
    }

    useEffect(() => { fetchAll(); }, [table]);

    return { data, loading, error, insert, update, remove, refetch: fetchAll };
}
`;

        case "asyncstorage":
            return `import { useState, useEffect, useCallback } from "react";
import { storeItem, getItem, removeItem } from "../storage/config";

export function useAsyncStorage<T>(key: string, defaultValue: T) {
    const [value,   setValue]   = useState<T>(defaultValue);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getItem<T>(key).then(stored => {
            if (stored !== null) setValue(stored);
            setLoading(false);
        });
    }, [key]);

    const save = useCallback(async (newValue: T) => {
        setValue(newValue);
        await storeItem(key, newValue);
    }, [key]);

    const clear = useCallback(async () => {
        setValue(defaultValue);
        await removeItem(key);
    }, [key, defaultValue]);

    return { value, loading, save, clear };
}
`;

        case "sqlite":
            return `import { useState, useEffect } from "react";
import { db, initDatabase } from "../storage/config";

export function useSQLite() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        initDatabase();
        setReady(true);
    }, []);

    function set(key: string, value: unknown): void {
        db.runSync(
            "INSERT INTO items (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            [key, JSON.stringify(value)]
        );
    }

    function get<T>(key: string): T | null {
        const row = db.getFirstSync<{ value: string }>(
            "SELECT value FROM items WHERE key = ?",
            [key]
        );
        return row ? (JSON.parse(row.value) as T) : null;
    }

    function remove(key: string): void {
        db.runSync("DELETE FROM items WHERE key = ?", [key]);
    }

    return { ready, set, get, remove };
}
`;
    }
}

export function storageUsageInstructions(provider: StorageProvider): string {
    switch (provider) {
        case "supabase":
            return `Next steps:
    1. Create a project at https://supabase.com
    2. Fill in your URL and anon key in storage/config.ts
    3. Use the hook in any screen:
        import { useSupabase } from "../hooks/useStorage";
        const { data, loading, insert, remove } = useSupabase<MyType>("my_table");`;

        case "asyncstorage":
            return `Next steps:
    1. No credentials needed — works out of the box.
    2. Use the hook in any screen:
        import { useAsyncStorage } from "../hooks/useStorage";
        const { value, loading, save, clear } = useAsyncStorage<string>("user_token", "");`;

        case "sqlite":
            return `Next steps:
    1. No credentials needed — works out of the box.
    2. initDatabase() runs automatically the first time the hook is used.
    3. Use the hook in any screen:
        import { useSQLite } from "../hooks/useStorage";
        const { ready, set, get, remove } = useSQLite();`;
    }
}