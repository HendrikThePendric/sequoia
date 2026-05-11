import { defineConfig, globalIgnores } from 'eslint/config'
import dhis2React from '@dhis2/config-eslint/react'

export default defineConfig([
    dhis2React,
    globalIgnores(['dist/**/*', 'storybook-static/**/*']),
    {
        settings: {
            'import/resolver': {
                typescript: true,
            },
        },
    },
])
