export function createLayoutTemplate(name: string, type: "stack" | "tab" | "root"): string {
    const componentName = `${name}Layout`;

    switch (type) {
        case "stack":
            return `import { View, Text } from 'react-native'
import { Stack } from 'expo-router'

export default function ${componentName}() {
    return (
        <Stack/>
    )
}
`;

        case "tab":
            return `import { View, Text } from 'react-native'
import { Tabs } from 'expo-router'

export default function ${componentName}() {
    return (
        <Tabs/>
    )
}
`;

        case "root":
            return `import { Stack } from 'expo-router'

export default function ${componentName}() {
    return (
        <RootNavigation/>
    )
}

function RootNavigation() {
    return (
        <Stack/>
    )
}
`;
    }
}