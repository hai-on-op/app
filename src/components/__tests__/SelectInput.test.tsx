import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SelectInput } from '../SelectInput'
import { darkTheme } from '~/styles/themes'

const options = [
    { label: 'Base', value: 8453 },
    { label: 'Optimism', value: 10 },
]

function select(onChange = vi.fn(), disabled = false) {
    return (
        <ThemeProvider theme={darkTheme}>
            <SelectInput
                label="Minting network"
                subLabel="Choose a network"
                options={options}
                value={8453}
                onChange={onChange}
                disabled={disabled}
            />
        </ThemeProvider>
    )
}

afterEach(cleanup)

describe('SelectInput', () => {
    it('opens the styled list and selects the original typed option value', () => {
        const onChange = vi.fn()
        render(select(onChange))
        const trigger = screen.getByRole('combobox', { name: 'Minting network' })

        fireEvent.click(trigger)
        expect(trigger.getAttribute('aria-expanded')).toBe('true')
        expect(screen.getByRole('listbox', { name: 'Minting network' })).toBeTruthy()
        expect(screen.getByRole('option', { name: 'Base' }).getAttribute('aria-selected')).toBe('true')
        fireEvent.click(screen.getByRole('option', { name: 'Optimism' }))

        expect(onChange).toHaveBeenCalledWith(10)
        expect(trigger.getAttribute('aria-expanded')).toBe('false')
        expect(screen.queryByRole('listbox')).toBeNull()
        expect(document.activeElement).toBe(trigger)
    })

    it('supports keyboard opening, navigation, and selection', () => {
        const onChange = vi.fn()
        render(select(onChange))
        const trigger = screen.getByRole('combobox', { name: 'Minting network' })
        trigger.focus()
        fireEvent.keyDown(trigger, { key: 'ArrowDown' })
        fireEvent.keyDown(trigger, { key: 'ArrowDown' })

        const option = screen.getByRole('option', { name: 'Optimism' })
        expect(trigger.getAttribute('aria-activedescendant')).toBe(option.id)
        fireEvent.keyDown(trigger, { key: 'Enter' })
        expect(onChange).toHaveBeenCalledWith(10)
        expect(screen.queryByRole('listbox')).toBeNull()
    })

    it('closes without changing the value on Escape, Tab, or an outside click', () => {
        const onChange = vi.fn()
        render(select(onChange))
        const trigger = screen.getByRole('combobox', { name: 'Minting network' })
        for (const key of ['Escape', 'Tab']) {
            fireEvent.click(trigger)
            fireEvent.keyDown(trigger, { key })
            expect(screen.queryByRole('listbox')).toBeNull()
        }
        fireEvent.click(trigger)
        fireEvent.click(document.body)
        expect(screen.queryByRole('listbox')).toBeNull()
        expect(onChange).not.toHaveBeenCalled()
    })

    it('closes an open menu and blocks changes when the control becomes disabled', () => {
        const onChange = vi.fn()
        const view = render(select(onChange))
        const trigger = screen.getByRole('combobox', { name: 'Minting network' }) as HTMLButtonElement
        fireEvent.click(trigger)
        expect(screen.getByRole('listbox')).toBeTruthy()

        view.rerender(select(onChange, true))
        expect(trigger.disabled).toBe(true)
        expect(screen.queryByRole('listbox')).toBeNull()
        fireEvent.click(trigger)
        fireEvent.keyDown(trigger, { key: 'ArrowDown' })
        expect(screen.queryByRole('listbox')).toBeNull()
        expect(onChange).not.toHaveBeenCalled()
    })
})
