import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  controlMCPServer,
  deleteMCPServer,
  fetchMCPTemplateCatalog,
  fetchMCPServerDetails,
  fetchMCPServers,
  probeMCPServer,
  registerRemoteMCPServer,
  updateRemoteMCPServer,
} from '@/features/mcp/api/client'
import { MCPSettingsSection } from './mcp-settings-section'

vi.mock('@/features/mcp/api/client', () => ({
  controlMCPServer: vi.fn(),
  deleteMCPServer: vi.fn(),
  fetchMCPTemplateCatalog: vi.fn(),
  fetchMCPServerDetails: vi.fn(),
  fetchMCPServers: vi.fn(),
  probeMCPServer: vi.fn(),
  registerRemoteMCPServer: vi.fn(),
  updateRemoteMCPServer: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

const mcpTemplates = [
  {
    auth: {
      header_name: 'Authorization',
      kind: 'bearer_token' as const,
      secret_label: 'Bearer token',
      secret_placeholder: 'context7 token',
      value_prefix: 'Bearer ',
    },
    description: 'Reference docs endpoint with bearer-token auth helper.',
    display_name: 'Context7',
    endpoint: 'https://mcp.context7.com/mcp',
    id: 'context7',
    suggested_server_id: 'mcp.context7',
  },
  {
    auth: {
      header_name: 'X-API-Key',
      kind: 'header_value' as const,
      secret_label: 'API key',
      secret_placeholder: 'provider api key',
      value_prefix: '',
    },
    description: 'Generic API-key template.',
    display_name: 'Generic API key',
    endpoint: undefined,
    id: 'generic-api-key',
    suggested_server_id: 'mcp.remote',
  },
]

describe('MCPSettingsSection', () => {
  it('loads and renders registered MCP servers', async () => {
    vi.mocked(fetchMCPTemplateCatalog).mockResolvedValue(mcpTemplates)
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
    expect(screen.getByText('1 registered')).toBeInTheDocument()
    expect(screen.getByText('0 active')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Context7' })).toBeInTheDocument()
  })

  it('filters the visible MCP inventory', async () => {
    vi.mocked(fetchMCPTemplateCatalog).mockResolvedValue(mcpTemplates)
    vi.mocked(fetchMCPServers).mockResolvedValue([
      {
        active: false,
        enabled: true,
        endpoint: 'https://mcp.context7.com/mcp',
        id: 'mcp.context7',
        state: 'stopped',
        type: 'remote',
      },
      {
        active: true,
        enabled: false,
        endpoint: 'https://mcp.docs.test/mcp',
        id: 'mcp.docs',
        state: 'idle',
        type: 'remote',
      },
    ])

    render(<MCPSettingsSection />)

    await expect(screen.findByText('mcp.context7')).resolves.toBeInTheDocument()
    await expect(screen.findByText('mcp.docs')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter MCP servers' }), {
      target: { value: 'disabled' },
    })

    expect(screen.getByText('2 registered')).toBeInTheDocument()
    expect(screen.getByText('1 visible')).toBeInTheDocument()
    expect(screen.getByText('mcp.docs')).toBeInTheDocument()
    expect(screen.queryByText('mcp.context7')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter MCP servers' }), {
      target: { value: 'missing' },
    })

    expect(screen.getByText('No MCP servers match current filter.')).toBeInTheDocument()
  })

  it('registers a remote MCP server with template auth helper and refreshes the visible list', async () => {
    vi.mocked(fetchMCPTemplateCatalog).mockResolvedValue(mcpTemplates)
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Bearer token' }), {
      target: { value: 'test-token' },
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
    vi.mocked(fetchMCPTemplateCatalog).mockResolvedValue(mcpTemplates)
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
    vi.mocked(fetchMCPTemplateCatalog).mockResolvedValue(mcpTemplates)
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

  it('loads remote MCP details into edit mode and saves changes', async () => {
    vi.mocked(fetchMCPTemplateCatalog).mockResolvedValue(mcpTemplates)
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
    vi.mocked(fetchMCPServerDetails).mockResolvedValue({
      active: false,
      enabled: true,
      endpoint: 'https://mcp.context7.com/mcp',
      headers: { Authorization: '********' },
      id: 'mcp.context7',
      state: 'stopped',
      type: 'remote',
    })
    vi.mocked(updateRemoteMCPServer).mockResolvedValue({
      active: false,
      enabled: true,
      endpoint: 'https://mcp.context7.com/v2',
      id: 'mcp.context7',
      state: 'stopped',
      type: 'remote',
    })

    render(<MCPSettingsSection />)

    await expect(screen.findByText('mcp.context7')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    await waitFor(() => {
      expect(fetchMCPServerDetails).toHaveBeenCalledWith('mcp.context7')
      expect(screen.getByRole('textbox', { name: 'MCP request headers' })).toHaveValue(
        'Authorization: ********',
      )
    })

    fireEvent.change(screen.getByRole('textbox', { name: 'MCP endpoint URL' }), {
      target: { value: 'https://mcp.context7.com/v2' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'MCP request headers' }), {
      target: { value: 'Authorization: Bearer new-token' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save MCP server changes' }))

    await waitFor(() => {
      expect(updateRemoteMCPServer).toHaveBeenCalledWith('mcp.context7', {
        endpoint: 'https://mcp.context7.com/v2',
        headers: { Authorization: 'Bearer new-token' },
        id: 'mcp.context7',
      })
      expect(screen.getByText('Saved mcp.context7.')).toBeInTheDocument()
      expect(screen.getByText('https://mcp.context7.com/v2')).toBeInTheDocument()
    })
  })

  it('deletes remote MCP servers from the visible list', async () => {
    vi.mocked(fetchMCPTemplateCatalog).mockResolvedValue(mcpTemplates)
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
    vi.mocked(deleteMCPServer).mockResolvedValue('mcp.context7')

    render(<MCPSettingsSection />)

    await expect(screen.findByText('mcp.context7')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(deleteMCPServer).toHaveBeenCalledWith('mcp.context7')
      expect(screen.getByText('Deleted mcp.context7.')).toBeInTheDocument()
      expect(screen.getByText('No MCP servers registered yet.')).toBeInTheDocument()
    })
  })

  it('loads MCP templates into the form and probes the draft endpoint with helper auth', async () => {
    vi.mocked(fetchMCPTemplateCatalog).mockResolvedValue(mcpTemplates)
    vi.mocked(fetchMCPServers).mockResolvedValue([])
    vi.mocked(probeMCPServer).mockResolvedValue({
      http_status: 200,
      message: 'Connected. Endpoint completed initialize and advertised 2 tool(s).',
      protocol_version: '2024-11-05',
      reachable: true,
      server_name: 'Context7',
      server_version: '1.2.3',
      status: 'ready',
      tool_count: 2,
    })

    render(<MCPSettingsSection />)

    await expect(screen.findByRole('button', { name: 'Generic API key' })).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Generic API key' }))
    expect(screen.getByRole('textbox', { name: 'MCP server id' })).toHaveValue('mcp.remote')
    expect(screen.getByRole('textbox', { name: 'API key' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'MCP endpoint URL' }), {
      target: { value: 'https://mcp.example.test/mcp' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'API key' }), {
      target: { value: 'api-key-value' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Test MCP endpoint' }))

    await waitFor(() => {
      expect(probeMCPServer).toHaveBeenCalledWith({
        endpoint: 'https://mcp.example.test/mcp',
        headers: { 'X-API-Key': 'api-key-value' },
        id: 'mcp.remote',
      })
      expect(screen.getByText(/Probe `ready`:/)).toBeInTheDocument()
    })
  })
})
