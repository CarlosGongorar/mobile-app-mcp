// Templates for the configure-auth tool.
// All generated code is plain JS/JSX (the target Expo app is JavaScript).

// Colors preamble: import from the generated theme if select-design ran,
// otherwise fall back to a neutral inline palette so the screens still render.
function colorsPreamble(hasTheme: boolean): string {
    if (hasTheme) {
        return `import colors from '../../styles'`;
    }
    return `const colors = {
    primary: '#2196F3',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#212121',
    textSecondary: '#757575',
    textOnPrimary: '#FFFFFF',
    border: '#E0E0E0',
    error: '#B00020',
}`;
}

// hooks/useAuth.jsx — AuthProvider + useAuth hook backed by supabase.auth.
export function authHookTemplate(): string {
    return `import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../storage/config'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    async function signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        return { data, error }
    }

    async function signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        return { data, error }
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
`;
}

// app/_layout.jsx — root layout wrapping AuthProvider and enforcing protected routes.
export function rootLayoutWithAuthTemplate(): string {
    return `import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '../hooks/useAuth'

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootNavigation/>
        </AuthProvider>
    )
}

function RootNavigation() {
    const { session, loading } = useAuth()
    const segments = useSegments()
    const router = useRouter()

    useEffect(() => {
        if (loading) return

        const inAuthGroup = segments[0] === '(auth)'

        if (!session && !inAuthGroup) {
            // Not signed in and outside the auth group -> send to login
            router.replace('/(auth)/login')
        } else if (session && inAuthGroup) {
            // Signed in but still on an auth screen -> send to the app
            router.replace('/')
        }
    }, [session, loading, segments])

    return <Stack screenOptions={{ headerShown: false }} />
}
`;
}

// app/(auth)/_layout.jsx — stack navigator for the auth screens.
export function authLayoutTemplate(): string {
    return `import { Stack } from 'expo-router'

export default function AuthLayout() {
    return <Stack screenOptions={{ headerShown: false }} />
}
`;
}

// app/(auth)/login.jsx
export function loginScreenTemplate(hasTheme: boolean): string {
    return `import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
${colorsPreamble(hasTheme)}

export default function Login() {
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleLogin() {
        if (!email || !password) {
            Alert.alert('Missing fields', 'Please enter your email and password.')
            return
        }
        setLoading(true)
        const { error } = await signIn(email, password)
        setLoading(false)
        if (error) Alert.alert('Login failed', error.message)
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome back</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
            </TouchableOpacity>

            <Link href="/(auth)/register" style={styles.link}>
                Don't have an account? Sign up
            </Link>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
    title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 32 },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
        color: colors.text,
        backgroundColor: colors.surface,
    },
    button: { backgroundColor: colors.primary, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
    link: { color: colors.primary, textAlign: 'center', marginTop: 24 },
})
`;
}

// app/(auth)/register.jsx
export function registerScreenTemplate(hasTheme: boolean): string {
    return `import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
${colorsPreamble(hasTheme)}

export default function Register() {
    const { signUp } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleRegister() {
        if (!email || !password) {
            Alert.alert('Missing fields', 'Please enter your email and password.')
            return
        }
        setLoading(true)
        const { error } = await signUp(email, password)
        setLoading(false)
        if (error) Alert.alert('Sign up failed', error.message)
        else Alert.alert('Check your inbox', 'Confirm your email to finish signing up.')
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create account</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Sign up'}</Text>
            </TouchableOpacity>

            <Link href="/(auth)/login" style={styles.link}>
                Already have an account? Sign in
            </Link>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
    title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 32 },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
        color: colors.text,
        backgroundColor: colors.surface,
    },
    button: { backgroundColor: colors.primary, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
    link: { color: colors.primary, textAlign: 'center', marginTop: 24 },
})
`;
}
