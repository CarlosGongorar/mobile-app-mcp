export const COMPONENTS: Record<string, () => string> = {

    button: () => `import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import colors from "../styles.js";

const variantStyles = {
    primary: {
        container: {
            backgroundColor: colors.primary,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
            elevation: 4,
        },
        label: { color: colors.textOnPrimary },
    },
    outline: {
        container: {
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: colors.primary,
        },
        label: { color: colors.primary },
    },
    ghost: {
        container: { backgroundColor: colors.primaryLight },
        label: { color: colors.primaryDark },
    },
    danger: {
        container: { backgroundColor: colors.error },
        label: { color: colors.textOnPrimary },
    },
};

export default function Button({
    label,
    onPress,
    variant = "primary",
    loading = false,
    disabled = false,
    style,
    labelStyle,
}) {
    const theme = variantStyles[variant] ?? variantStyles.primary;

    return (
        <TouchableOpacity
            style={[styles.container, theme.container, (disabled || loading) && styles.disabled, style]}
            onPress={onPress}
            activeOpacity={0.8}
            disabled={disabled || loading}
        >
            {loading
                ? <ActivityIndicator color={theme.label.color} />
                : <Text style={[styles.label, theme.label, labelStyle]}>{label}</Text>
            }
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
    },
    disabled: {
        opacity: 0.5,
    },
});
`,

    input: () => `import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import colors from "../styles.js";

const variantStyles = {
    default: {
        input: {
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: 8,
        },
        inputFocused: { borderColor: colors.primary },
    },
    filled: {
        input: {
            backgroundColor: colors.divider,
            borderWidth: 0,
            borderBottomWidth: 2,
            borderBottomColor: colors.border,
            borderRadius: 4,
        },
        inputFocused: { borderBottomColor: colors.primary },
    },
};

export default function Input({
    label,
    value,
    onChangeText,
    placeholder = "",
    variant = "default",
    secureTextEntry = false,
    errorMessage = "",
    keyboardType = "default",
    style,
    inputStyle,
    labelStyle,
}) {
    const [focused, setFocused] = useState(false);
    const theme = variantStyles[variant] ?? variantStyles.default;

    return (
        <View style={[styles.container, style]}>
            {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
            <TextInput
                style={[
                    styles.input,
                    theme.input,
                    focused && theme.inputFocused,
                    errorMessage ? styles.inputError : null,
                    inputStyle,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 16 },
    label: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 6,
    },
    input: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        fontSize: 16,
        color: colors.text,
    },
    inputError: { borderColor: colors.error },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 4,
    },
});
`,

    text: () => `import React from "react";
import { Text } from "react-native";
import colors from "../styles.js";

const variantStyles = {
    heading: {
        color: colors.text,
        fontSize: 28,
        fontWeight: "700",
        lineHeight: 36,
        letterSpacing: -0.5,
    },
    subheading: {
        color: colors.text,
        fontSize: 20,
        fontWeight: "600",
        lineHeight: 28,
    },
    body: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "400",
        lineHeight: 24,
    },
    caption: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "400",
        lineHeight: 18,
    },
    label: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 20,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
};

export default function StyledText({ children, variant = "body", style, numberOfLines, onPress }) {
    const theme = variantStyles[variant] ?? variantStyles.body;

    return (
        <Text style={[theme, style]} numberOfLines={numberOfLines} onPress={onPress}>
            {children}
        </Text>
    );
}
`,

    card: () => `import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import colors from "../styles.js";

const variantStyles = {
    default: {
        card: {
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.8,
            shadowRadius: 6,
            elevation: 3,
        },
        title: { color: colors.text },
        body: { color: colors.textSecondary },
    },
    outlined: {
        card: {
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.border,
        },
        title: { color: colors.text },
        body: { color: colors.textSecondary },
    },
    colored: {
        card: {
            backgroundColor: colors.primaryLight,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
        },
        title: { color: colors.primaryDark },
        body: { color: colors.text },
    },
};

export default function Card({
    title,
    body,
    onPress,
    variant = "default",
    style,
    titleStyle,
    bodyStyle,
    children,
}) {
    const Wrapper = onPress ? TouchableOpacity : View;
    const theme = variantStyles[variant] ?? variantStyles.default;

    return (
        <Wrapper style={[styles.card, theme.card, style]} onPress={onPress} activeOpacity={0.85}>
            {title ? <Text style={[styles.title, theme.title, titleStyle]}>{title}</Text> : null}
            {body ? <Text style={[styles.body, theme.body, bodyStyle]}>{body}</Text> : null}
            {children}
        </Wrapper>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
    },
});
`,

    badge: () => `import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "../styles.js";

const variantStyles = {
    default: {
        badge: { backgroundColor: colors.primary },
        text: { color: colors.textOnPrimary },
    },
    success: {
        badge: { backgroundColor: colors.success },
        text: { color: "#FFFFFF" },
    },
    warning: {
        badge: { backgroundColor: colors.warning },
        text: { color: "#FFFFFF" },
    },
    error: {
        badge: { backgroundColor: colors.error },
        text: { color: "#FFFFFF" },
    },
};

export default function Badge({ label, variant = "default", style, labelStyle }) {
    const theme = variantStyles[variant] ?? variantStyles.default;

    return (
        <View style={[styles.badge, theme.badge, style]}>
            <Text style={[styles.text, theme.text, labelStyle]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        borderRadius: 99,
        paddingVertical: 3,
        paddingHorizontal: 10,
        alignSelf: "flex-start",
    },
    text: {
        fontSize: 12,
        fontWeight: "600",
    },
});
`,

    divider: () => `import React from "react";
import { View, StyleSheet } from "react-native";
import colors from "../styles.js";

export default function Divider({ spacing = 16, style }) {
    return <View style={[styles.divider, { marginVertical: spacing }, style]} />;
}

const styles = StyleSheet.create({
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        width: "100%",
    },
});
`,

    avatar: () => `import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import colors from "../styles.js";

const variantStyles = {
    default: {
        container: { backgroundColor: colors.primary },
        initials: { color: colors.textOnPrimary },
    },
    outlined: {
        container: {
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: colors.primary,
        },
        initials: { color: colors.primary },
    },
};

export default function Avatar({ name = "", imageUri = null, size = 48, variant = "default", style }) {
    const theme = variantStyles[variant] ?? variantStyles.default;

    const initials = name
        .split(" ")
        .map((word) => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const dynamicSize = { width: size, height: size, borderRadius: size / 2 };

    return (
        <View style={[styles.container, theme.container, dynamicSize, style]}>
            {imageUri
                ? <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
                : <Text style={[styles.initials, theme.initials]}>{initials}</Text>
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: "center", justifyContent: "center" },
    initials: { fontSize: 18, fontWeight: "700" },
});
`,
};

// Variantes disponibles por componente
export const VARIANTS: Record<string, string[]> = {
    button: ["primary", "outline", "ghost", "danger"],
    input: ["default", "filled"],
    text: ["heading", "subheading", "body", "caption", "label"],
    card: ["default", "outlined", "colored"],
    badge: ["default", "success", "warning", "error"],
    divider: ["default"],
    avatar: ["default", "outlined"],
};

export function buildUsageExample(type: string, name: string): string {
    const imp = `import ${name} from "./components/${name}.jsx";`;

    const examples: Record<string, string> = {
        button: `${imp}

<Button label="Guardar" onPress={handleSave} />
<Button label="Cancelar" variant="outline" onPress={handleCancel} />
<Button label="Borrar" variant="danger" onPress={handleDelete} />
        
// Estilo externo (ancho completo, altura custom)
<Button label="Entrar" style={{ width: "100%", paddingVertical: 16 }} />
// Estilo en el label
<Button label="Grande" labelStyle={{ fontSize: 20 }} />`,

        input: `${imp}

<Input label="Correo" value={email} onChangeText={setEmail} />
<Input label="Contraseña" variant="filled" secureTextEntry value={pass} onChangeText={setPass} />

// Estilo externo en el wrapper y en el input interno
<Input label="Bio" style={{ marginBottom: 32 }} inputStyle={{ height: 80 }} />`,

        text: `${imp}

<StyledText variant="heading">Título principal</StyledText>
<StyledText variant="subheading">Sección</StyledText>
<StyledText variant="body">Párrafo normal.</StyledText>
<StyledText variant="caption">Nota al pie</StyledText>
<StyledText variant="label">Etiqueta</StyledText>

// Sobreescribir tamaño o color
<StyledText variant="heading" style={{ fontSize: 40, color: colors.primary }}>Hero</StyledText>`,

        card: `${imp}

<Card title="Tarjeta" body="Descripción." onPress={handlePress} />
<Card variant="outlined" title="Info" body="Detalles aquí." />
<Card variant="colored" title="Aviso" style={{ marginHorizontal: 16 }} />

// Con children
<Card variant="default">
    <Text variant="body">Contenido libre adentro</Text>
</Card>`,

        badge: `${imp}

<Badge label="Nuevo" />
<Badge label="Activo" variant="success" />
<Badge label="Pendiente" variant="warning" />
<Badge label="Error" variant="error" />

// Estilo externo
<Badge label="Top" style={{ alignSelf: "center" }} labelStyle={{ fontSize: 14 }} />`,

        divider: `${imp}

<Divider />
<Divider spacing={32} />

// Cambiar color o grosor
<Divider style={{ backgroundColor: colors.primary, height: 2 }} />`,

        avatar: `${imp}

<Avatar name="Juan Pérez" />
<Avatar name="Ana López" imageUri="https://..." />
<Avatar name="Carlos" variant="outlined" size={64} />

// Estilo externo
<Avatar name="María" style={{ marginRight: 8 }} />`,
    };

    return examples[type] ?? `${imp}\n<${name} />`;
}