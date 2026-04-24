import { expect, test, type Page } from '@playwright/test'

import {
  clearBrowserState,
  copyViaApi,
  fetchBootstrap,
  formatDisplayPath,
  listDirectoryViaApi,
  mkdirViaApi,
  readFileViaApi,
} from './runtime'

function getPane(page: Page, paneId: 'left' | 'right') {
  return {
    path: page.locator(`[id^="shell-tool-commander-pane-${paneId}-path-r"]`).first(),
    root: page.locator(`[id^="shell-tool-commander-pane-${paneId}-r"]`).first(),
    row: (name: string) =>
      page
        .locator(`[id^="shell-tool-commander-pane-${paneId}-r"]`)
        .first()
        .getByText(name, { exact: true })
        .first(),
  }
}

async function setPanePath(
  page: Page,
  paneId: 'left' | 'right',
  path: string,
) {
  const pane = getPane(page, paneId)

  await pane.root.click()
  await page.keyboard.press('Control+L')
  const pathInput = page.getByRole('textbox', { name: `Commander ${paneId} pane path` })
  await expect(pathInput).toBeVisible()
  await pathInput.fill(path)
  await pathInput.press('Enter')
  await expect(pane.path).toHaveText(path)
}

test('commander read-only wiring loads repo paths, navigates by tilde path, and previews files', async ({
  page,
  request,
}) => {
  const bootstrap = await fetchBootstrap(request)
  const repoRootDisplayPath = formatDisplayPath(bootstrap.repo_root, bootstrap.home_dir)
  const targetDirectoryPath = `${bootstrap.repo_root}/core/transport/httpapi`
  const targetDirectoryInput = formatDisplayPath(targetDirectoryPath, bootstrap.home_dir)
  const leftPaneRoot = page.locator('[id^="shell-tool-commander-pane-left-r"]').first()
  const leftPanePath = page.locator('[id^="shell-tool-commander-pane-left-path-r"]').first()
  const handlersSystemFile = page
    .locator('[id*="commander-pane-left-row-"][id*="handlers-system-go-name-"]')
    .first()

  await clearBrowserState(page)
  await page.goto('/')

  const coreRows = page.getByText('core', { exact: true })
  await expect(page.getByText(repoRootDisplayPath, { exact: true })).toHaveCount(2)
  await expect(leftPanePath).toHaveText(repoRootDisplayPath)
  await expect(coreRows).toHaveCount(2)
  await expect(page.getByText('frontend', { exact: true })).toHaveCount(2)

  await leftPaneRoot.click()
  await page.keyboard.press('Control+L')
  const leftPanePathInput = page.getByRole('textbox', { name: 'Commander left pane path' })
  await expect(leftPanePathInput).toBeVisible()
  await leftPanePathInput.fill(targetDirectoryInput)
  await leftPanePathInput.press('Enter')

  await expect(leftPanePath).toHaveText(targetDirectoryInput)
  await handlersSystemFile.scrollIntoViewIfNeeded()
  await expect(handlersSystemFile).toBeVisible()

  await handlersSystemFile.dblclick()

  const preview = page.getByRole('textbox', { name: 'View handlers_system.go' })
  await expect(preview).toBeVisible()
  await expect(preview).toContainText('package httpapi')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(preview).toBeHidden()

  await page.getByRole('button', { name: 'Go back in left pane' }).click()
  await expect(leftPanePath).toHaveText(repoRootDisplayPath)
})

test('commander mkdir creates a directory over the backend and focuses the new entry', async ({
  page,
  request,
}) => {
  const bootstrap = await fetchBootstrap(request)
  const repoRootDisplayPath = formatDisplayPath(bootstrap.repo_root, bootstrap.home_dir)
  const tmpDirectoryPath = `${bootstrap.repo_root}/tmp`
  const tmpDirectoryDisplayPath = formatDisplayPath(tmpDirectoryPath, bootstrap.home_dir)
  const createdDirectoryName = `mkdir-e2e-${Date.now()}`
  const createdDirectoryDisplayPath = `${tmpDirectoryDisplayPath}/${createdDirectoryName}`
  const leftPaneRoot = page.locator('[id^="shell-tool-commander-pane-left-r"]').first()
  const leftPanePath = page.locator('[id^="shell-tool-commander-pane-left-path-r"]').first()
  const tmpRow = page.locator('[id*="commander-pane-left-row-"][id*="-tmp-name-"]').first()

  await clearBrowserState(page)
  await page.goto('/')
  await expect(leftPanePath).toHaveText(repoRootDisplayPath)

  await leftPaneRoot.click()
  await tmpRow.dblclick()
  await expect(leftPanePath).toHaveText(tmpDirectoryDisplayPath)

  await page.keyboard.press('F7')
  const pendingInput = page.getByRole('textbox', { name: 'Commander directory name input' })
  await expect(pendingInput).toBeVisible()
  await pendingInput.fill(createdDirectoryName)
  await pendingInput.press('Enter')

  const createdDirectoryRow = page
    .locator(`[id*="commander-pane-left-row-"][id*="${createdDirectoryName}-name-"]`)
    .first()
  await expect(createdDirectoryRow).toBeVisible()

  await page.keyboard.press('Enter')
  await expect(leftPanePath).toHaveText(createdDirectoryDisplayPath)
})

test('commander copy, rename, move, and delete run through backend mutations', async ({
  page,
  request,
}) => {
  const bootstrap = await fetchBootstrap(request)
  const stamp = Date.now()
  const sourcePath = `${bootstrap.repo_root}/tmp/source-e2e-${stamp}`
  const copyTargetPath = `${bootstrap.repo_root}/tmp/copy-e2e-${stamp}`
  const moveTargetPath = `${bootstrap.repo_root}/tmp/move-e2e-${stamp}`
  const sourceDisplayPath = formatDisplayPath(sourcePath, bootstrap.home_dir)
  const copyTargetDisplayPath = formatDisplayPath(copyTargetPath, bootstrap.home_dir)
  const moveTargetDisplayPath = formatDisplayPath(moveTargetPath, bootstrap.home_dir)
  const renamedFileName = `README-copy-${stamp}.md`
  const leftPane = getPane(page, 'left')
  const rightPane = getPane(page, 'right')

  await mkdirViaApi(request, sourcePath)
  await mkdirViaApi(request, copyTargetPath)
  await mkdirViaApi(request, moveTargetPath)
  await copyViaApi(request, `${bootstrap.repo_root}/README.md`, sourcePath)

  await clearBrowserState(page)
  await page.goto('/')
  await setPanePath(page, 'left', sourceDisplayPath)
  await setPanePath(page, 'right', copyTargetDisplayPath)

  await leftPane.root.click()
  await page.keyboard.press('F5')
  await page.keyboard.press('Enter')
  await expect
    .poll(async () => {
      const listing = await listDirectoryViaApi(request, copyTargetPath)
      return listing.files?.map((entry) => entry.name) ?? []
    })
    .toContain('README.md')

  await rightPane.root.click()
  await page.keyboard.press('F2')
  const renameInput = page.getByRole('textbox', { name: 'Commander pending operation input' })
  await expect(renameInput).toBeVisible()
  await renameInput.fill(renamedFileName)
  await renameInput.press('Enter')
  await expect
    .poll(async () => {
      const listing = await listDirectoryViaApi(request, copyTargetPath)
      return listing.files?.map((entry) => entry.name) ?? []
    })
    .toContain(renamedFileName)

  await setPanePath(page, 'left', moveTargetDisplayPath)

  await rightPane.root.click()
  await page.keyboard.press('F6')
  await page.keyboard.press('Enter')
  await expect
    .poll(async () => {
      const [copyListing, moveListing] = await Promise.all([
        listDirectoryViaApi(request, copyTargetPath),
        listDirectoryViaApi(request, moveTargetPath),
      ])

      return {
        copyFiles: copyListing.files?.map((entry) => entry.name) ?? [],
        moveFiles: moveListing.files?.map((entry) => entry.name) ?? [],
      }
    })
    .toEqual({
      copyFiles: [],
      moveFiles: [renamedFileName],
    })

  await leftPane.root.click()
  await page.keyboard.press('F8')
  await page.keyboard.press('Enter')
  await expect
    .poll(async () => {
      const listing = await listDirectoryViaApi(request, moveTargetPath)
      return listing.files?.map((entry) => entry.name) ?? []
    })
    .toEqual([])
})

test('commander same-pane clone copy and F4 save run through backend file APIs', async ({
  page,
  request,
}) => {
  const bootstrap = await fetchBootstrap(request)
  const stamp = Date.now()
  const cloneRootPath = `${bootstrap.repo_root}/tmp/clone-e2e-${stamp}`
  const cloneRootDisplayPath = formatDisplayPath(cloneRootPath, bootstrap.home_dir)
  const cloneFileName = `README-clone-${stamp}.md`
  const cloneFilePath = `${cloneRootPath}/${cloneFileName}`
  const leftPane = getPane(page, 'left')
  const rightPane = getPane(page, 'right')

  await mkdirViaApi(request, cloneRootPath)
  await copyViaApi(request, `${bootstrap.repo_root}/README.md`, cloneRootPath)

  await clearBrowserState(page)
  await page.goto('/')
  await setPanePath(page, 'left', cloneRootDisplayPath)
  await setPanePath(page, 'right', cloneRootDisplayPath)

  await leftPane.root.click()
  await page.keyboard.press('F5')
  const copyInput = page.getByRole('textbox', { name: 'Commander copy target name input' })
  await expect(copyInput).toBeVisible()
  await copyInput.fill(cloneFileName)
  await copyInput.press('Enter')

  await expect
    .poll(async () => {
      const listing = await listDirectoryViaApi(request, cloneRootPath)
      return listing.files?.map((entry) => entry.name) ?? []
    })
    .toContain(cloneFileName)

  await page.getByRole('button', { name: 'F4 Edit' }).click()
  const editor = page.getByRole('textbox', { name: `Edit ${cloneFileName}` })
  await expect(editor).toBeVisible()
  await editor.fill(`# clone ${stamp}\n`)
  await page.keyboard.press('Control+S')

  await expect
    .poll(async () => {
      const file = await readFileViaApi(request, cloneFilePath)
      return file.content
    })
    .toBe(`# clone ${stamp}\n`)
})
