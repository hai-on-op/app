import React from 'react'
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './testUtils'

function Dummy() {
    return <div data-testid="dummy">ok</div>
}

describe('renderWithProviders', () => {
    it('renders within QueryClientProvider', () => {
        renderWithProviders(<Dummy />)
        expect(screen.getByTestId('dummy').textContent).toBe('ok')
    })
})


