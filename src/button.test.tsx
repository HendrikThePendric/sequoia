import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button component', () => {
    it('Button should render correctly', () => {
        render(<Button numb={3} label="test" />)
        const button = screen.getByRole('button')
        expect(button).toBeInTheDocument()
    })
})
