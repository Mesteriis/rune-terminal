import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { controlMCPServer, fetchMCPServers, registerRemoteMCPServer } from '@/features/mcp/api/client'
import { MCPSettingsSection } from './mcp-settings-section'

vi.mock('@/features/mcp/api/client', () => ({
  controlMCPServer: vi.fn(),
  fetchMCPServers: vi.fn(),
  registerRemoteMCPServer: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('MCPSettingsSection', () => {
  it('loads and renders registered MCP servers', async () => {
    vi.mocked(fetchMCPServers).mockResolvedValue([
      {
        active: false,
        enabled: true,
        endpoint: 'https://mcp.context7.com/mcp',
        id: 'mcp.context7',
        state: 'stopped',
        type: 'remote',
      },
    ])

    render(<MCPSettingsSection />)

    await expect(screen.findByText('mcp.context7')).resolves.toBeInTheDocument()
    expect(screen.getByText('https://mcp.context7.com/mcp')).toBeInTheDocument()
    expect(screen.getByText('stopped')).toBeInTheDocument()
  })

  it('registers a remote MCP server and refreshes the visible list', async () => {
    vi.mocked(fetchMCPServers).mockResolvedValue([])
    vi.mocked(registerRemoteMCPServer).mockResolvedValue({
      active: false,
      enabled: true,
      endpoint: 'https://mcp.example.test/mcp',
      id: 'mcp.example',
      state: 'stopped',
      type: 'remote',
    })

    render(<MCPSettingsSection />)

    await expect(screen.findByText('No MCP servers registered yet.')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'MCP server id' }), {
      target: { value: 'mcp.example' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'MCP endpoint URL' }), {
      target: { value: 'https://mcp.example.test/mcp' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'MCP request headers' }), {
      target: { value: 'Authorization: Bearer test-token' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Register remote MCP server' }))

    await waitFor(() => {
      expect(registerRemoteMCPServer).toHaveBeenCalledWith({
        endpoint: 'https://mcp.example.test/mcp',
        headers: { Authorization: 'Bearer test-token' },
        id: 'mcp.example',
      })
      expect(
        screen.getByText('Registered mcp.example. Start it explicitly before invoke.'),
      ).toBeInTheDocument()
      expect(screen.getByText('mcp.example')).toBeInTheDocument()
    })
  })

  it('shows header parse errors without calling the backend', async () => {
    vi.mocked(fetchMCPServers).mockResolvedValue([])

    render(<MCPSettingsSection />)

    await expect(screen.findByText('No MCP servers registered yet.')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'MCP request headers' }), {
      target: { value: 'Authorization' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Register remote MCP server' }))

    await expect(
      screen.findByText('Header lines must use `Name: value` format.'),
    ).resolves.toBeInTheDocument()
    expect(registerRemoteMCPServer).not.toHaveBeenCalled()
  })

  it('runs lifecycle controls and updates the server row', async () => {
    vi.mocked(fetchMCPServers).mockResolvedValue([
      {
        active: false,
        enabled: true,
        endpoint: 'https://mcp.context7.com/mcp',
        id: 'mcp.context7',
        state: 'stopped',
        type: 'remote',
      },
    ])
    vi.mocked(controlMCPServer).mockResolvedValue({
      active: true,
      enabled: true,
      endpoint: 'https://mcp.context7.com/mcp',
      id: 'mcp.context7',
      state: 'idle',
      type: 'remote',
    })

    render(<MCPSettingsSection />)

    await expect(screen.findByText('mcp.context7')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    await waitFor(() => {
      expect(controlMCPServer).toHaveBeenCalledWith('mcp.context7', 'start')
      expect(screen.getByText('mcp.context7: start complete.')).toBeInTheDocument()
      expect(screen.getByText('idle')).toBeInTheDocument()
      expect(screen.getByText('active')).toBeInTheDocument()
    })
  })
})
