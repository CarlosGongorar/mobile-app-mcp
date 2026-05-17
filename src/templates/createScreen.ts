export function createScreenTemplate(screen_name: string) {
    return `import { View, Text } from 'react-native'
import React from 'react'

export default function ${screen_name}() {
    return (
        <View>
            <Text>${screen_name}</Text>
        </View>
    )
}`
}