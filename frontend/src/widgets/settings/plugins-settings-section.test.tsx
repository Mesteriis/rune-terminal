import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  deleteInstalledPlugin,
  disablePlugin,
  enablePlugin,
  fetchInstalledPlugins,
  installPlugin,
  updateInstalledPlugin,
} from '@/features/plugins/api/client'
import { PluginsSettingsSection } from './plugins-settings-section'

vi.mock('@/features/plugins/api/client', () => ({
  deleteInstalledPlugin: vi.fn(),
  disablePlugin: vi.fn(),
  enablePlugin: vi.fn(),
  fetchInstalledPlugins: vi.fn(),
  installPlugin: vi.fn(),
  updateInstalledPlugin: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

const pluginCatalog = {
  current_actor: {
    home_dir: '/Users/avm',
    username: 'avm',
  },
  plugins: [
    {
      access: {
        allowed_users: ['alice'],
        owner_username: 'avm',
        visibility: 'shared',
      },
      display_name: 'Ops Plugin',
      enabled: true,
      id: 'ops.plugin',
      installed_by: {
        username: 'avm',
      },
      metadata: {
        team: 'ops',
      },
      plugin_version: '1.0.0',
      protocol_version: 'rterm.plugin.v1',
      runtime_status: 'ready' as const,
      source: {
        kind: 'git' as const,
        ref: 'main',
        url: 'https://example.test/ops-plugin.git',
      },
      tools: [{ approval_tier: 'safe', name: 'plugin.ops_echo', target_kind: 'workspace' }],
      updated_by: {
        username: 'avm',
      },
    },
  ],
}

describe('PluginsSettingsSection', () => {
  it('loads and renders installed plugins', async () => {
    vi.mocked(fetchInstalledPlugins).mockResolvedValue(pluginCatalog)

    render(<PluginsSettingsSection />)

    await expect(screen.findByText('Ops Plugin')).resolves.toBeInTheDocument()
    expect(screen.getByText('1 installed')).toBeInTheDocument()
    expect(screen.getByText('1 enabled')).toBeInTheDocument()
    expect(screen.getByText('actor: avm')).toBeInTheDocument()
    expect(screen.getByText('owner: avm · shared · meta 1')).toBeInTheDocument()
  })

  it('installs a plugin from zip source with metadata and access drafts', async () => {
    vi.mocked(fetchInstalledPlugins).mockResolvedValue({
      current_actor: {
        username: 'avm',
      },
      plugins: [],
    })
    vi.mocked(installPlugin).mockResolvedValue({
      plugin: {
        access: {
          allowed_users: ['alice', 'bob'],
          owner_username: 'avm',
          visibility: 'private',
        },
        display_name: 'Zip Plugin',
        enabled: true,
        id: 'zip.plugin',
        installed_by: {
          username: 'avm',
        },
        metadata: {
          team: 'ops',
        },
        plugin_version: '1.2.0',
        protocol_version: 'rterm.plugin.v1',
        runtime_status: 'ready',
        source: {
          kind: 'zip',
          url: 'file:///tmp/plugin.zip',
        },
        tools: [],
        updated_by: {
          username: 'avm',
        },
      },
      plugins: {
        current_actor: {
          username: 'avm',
        },
        plugins: [
          {
            access: {
              allowed_users: ['alice', 'bob'],
              owner_username: 'avm',
              visibility: 'private',
            },
            display_name: 'Zip Plugin',
            enabled: true,
            id: 'zip.plugin',
            installed_by: {
              username: 'avm',
            },
            metadata: {
              team: 'ops',
            },
            plugin_version: '1.2.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'ready',
            source: {
              kind: 'zip',
              url: 'file:///tmp/plugin.zip',
            },
            tools: [],
            updated_by: {
              username: 'avm',
            },
          },
        ],
      },
    })

    render(<PluginsSettingsSection />)

    await expect(screen.findByText('No plugins installed yet.')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Plugin source kind' }), {
      target: { value: 'zip' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Plugin source URL' }), {
      target: { value: 'file:///tmp/plugin.zip' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Plugin metadata' }), {
      target: { value: 'team=ops' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Plugin visibility' }), {
      target: { value: 'private' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Plugin allowed users' }), {
      target: { value: 'alice\nbob' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Install from zip' }))

    await waitFor(() => {
      expect(installPlugin).toHaveBeenCalledWith({
        access: {
          allowed_users: ['alice', 'bob'],
          visibility: 'private',
        },
        metadata: {
          team: 'ops',
        },
        source: {
          kind: 'zip',
          ref: undefined,
          url: 'file:///tmp/plugin.zip',
        },
      })
      expect(screen.getByText('Installed Zip Plugin.')).toBeInTheDocument()
      expect(screen.getByText('Zip Plugin')).toBeInTheDocument()
    })
  })

  it('shows metadata draft parsing errors without calling install', async () => {
    vi.mocked(fetchInstalledPlugins).mockResolvedValue({
      current_actor: {
        username: 'avm',
      },
      plugins: [],
    })

    render(<PluginsSettingsSection />)

    await expect(screen.findByText('No plugins installed yet.')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Plugin source URL' }), {
      target: { value: 'https://example.test/rterm-plugin.git' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Plugin metadata' }), {
      target: { value: 'team' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Install from git' }))

    await expect(
      screen.findByText('Metadata lines must use `key=value` format.'),
    ).resolves.toBeInTheDocument()
    expect(installPlugin).not.toHaveBeenCalled()
  })

  it('filters the visible plugin catalog and runs lifecycle actions', async () => {
    vi.mocked(fetchInstalledPlugins).mockResolvedValue({
      current_actor: {
        username: 'avm',
      },
      plugins: [
        ...pluginCatalog.plugins,
        {
          access: {
            owner_username: 'avm',
            visibility: 'private',
          },
          display_name: 'Docs Plugin',
          enabled: false,
          id: 'docs.plugin',
          installed_by: {
            username: 'avm',
          },
          plugin_version: '0.9.0',
          protocol_version: 'rterm.plugin.v1',
          runtime_status: 'disabled' as const,
          source: {
            kind: 'zip' as const,
            url: 'file:///tmp/docs-plugin.zip',
          },
          tools: [],
          updated_by: {
            username: 'avm',
          },
        },
      ],
    })
    vi.mocked(enablePlugin).mockResolvedValue({
      plugin: {
        access: {
          owner_username: 'avm',
        },
        display_name: 'Docs Plugin',
        enabled: true,
        id: 'docs.plugin',
        installed_by: {
          username: 'avm',
        },
        plugin_version: '0.9.0',
        protocol_version: 'rterm.plugin.v1',
        runtime_status: 'ready',
        source: {
          kind: 'zip',
          url: 'file:///tmp/docs-plugin.zip',
        },
        tools: [],
        updated_by: {
          username: 'avm',
        },
      },
      plugins: {
        current_actor: {
          username: 'avm',
        },
        plugins: [
          pluginCatalog.plugins[0],
          {
            access: {
              owner_username: 'avm',
            },
            display_name: 'Docs Plugin',
            enabled: true,
            id: 'docs.plugin',
            installed_by: {
              username: 'avm',
            },
            plugin_version: '0.9.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'ready',
            source: {
              kind: 'zip',
              url: 'file:///tmp/docs-plugin.zip',
            },
            tools: [],
            updated_by: {
              username: 'avm',
            },
          },
        ],
      },
    })
    vi.mocked(updateInstalledPlugin).mockResolvedValue({
      plugin: {
        ...pluginCatalog.plugins[0],
        plugin_version: '2.0.0',
      },
      plugins: {
        current_actor: {
          username: 'avm',
        },
        plugins: [
          {
            ...pluginCatalog.plugins[0],
            plugin_version: '2.0.0',
          },
          {
            access: {
              owner_username: 'avm',
            },
            display_name: 'Docs Plugin',
            enabled: true,
            id: 'docs.plugin',
            installed_by: {
              username: 'avm',
            },
            plugin_version: '0.9.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'ready',
            source: {
              kind: 'zip',
              url: 'file:///tmp/docs-plugin.zip',
            },
            tools: [],
            updated_by: {
              username: 'avm',
            },
          },
        ],
      },
    })
    vi.mocked(deleteInstalledPlugin).mockResolvedValue({
      plugin: pluginCatalog.plugins[0],
      plugins: {
        current_actor: {
          username: 'avm',
        },
        plugins: [
          {
            access: {
              owner_username: 'avm',
            },
            display_name: 'Docs Plugin',
            enabled: true,
            id: 'docs.plugin',
            installed_by: {
              username: 'avm',
            },
            plugin_version: '0.9.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'ready',
            source: {
              kind: 'zip',
              url: 'file:///tmp/docs-plugin.zip',
            },
            tools: [],
            updated_by: {
              username: 'avm',
            },
          },
        ],
      },
    })

    render(<PluginsSettingsSection />)

    await expect(screen.findByText('Ops Plugin')).resolves.toBeInTheDocument()
    await expect(screen.findByText('Docs Plugin')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter installed plugins' }), {
      target: { value: 'disabled' },
    })

    expect(screen.getByText('Docs Plugin')).toBeInTheDocument()
    expect(screen.queryByText('Ops Plugin')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))

    await waitFor(() => {
      expect(enablePlugin).toHaveBeenCalledWith('docs.plugin')
      expect(screen.getByText('Docs Plugin enabled.')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter installed plugins' }), {
      target: { value: 'ops' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update' }))

    await waitFor(() => {
      expect(updateInstalledPlugin).toHaveBeenCalledWith('ops.plugin')
      expect(screen.getByText('Updated Ops Plugin to 2.0.0.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(deleteInstalledPlugin).toHaveBeenCalledWith('ops.plugin')
      expect(screen.getByText('Removed Ops Plugin.')).toBeInTheDocument()
    })
  })
})
