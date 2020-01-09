import { PackageJson, getWorkspaces, spawnAsync, spawnSync } from './utils'
import { gt, prerelease } from 'semver'
import ora from 'ora'
import latest from 'latest-version'
import Octokit from '@octokit/rest'

const { CI, GITHUB_EVENT_NAME, GITHUB_REF } = process.env

if (CI && (GITHUB_REF !== 'refs/heads/master' || GITHUB_EVENT_NAME !== 'push')) {
  console.log('publish skipped.')
  process.exit(0)
}

const headerMap = {
  feat: 'Features',
  fix: 'Bug Fixes',
}

;(async () => {
  const folders = await getWorkspaces()
  const spinner = ora()
  const bumpMap: Record<string, string> = {}

  let progress = 0
  spinner.start(`Loading workspaces (0/${folders.length})`)
  await Promise.all(folders.map(async (name) => {
    let meta: PackageJson
    try {
      meta = require(`../${name}/package`)
      if (!meta.private) {
        const version = await latest(meta.name)
        if (gt(meta.version, version)) {
          bumpMap[name] = meta.version
        }
      }
    } catch { /* pass */ }
    spinner.text = `Loading workspaces (${++progress}/${folders.length})`
  }))
  spinner.succeed()

  if (Object.keys(bumpMap).length) {
    for (const name in bumpMap) {
      console.log(`publishing ${name}@${bumpMap[name]} ...`)
      await spawnAsync(`yarn publish ${name}`)
    }
  }

  const { version } = require('../packages/koishi-cli/package') as PackageJson
  const tags = spawnSync('git tag -l').split(/\r?\n/)
  if (tags.includes(version)) {
    return console.log(`Tag ${version} already exists.`)
  }

  const updates = { fix: '', feat: '' }
  const lastTag = tags[tags.length - 1]
  const commits = spawnSync(`git log ${lastTag}..HEAD --format=%H%s`).split(/\r?\n/).reverse()
  for (const commit of commits) {
    const hash = commit.slice(0, 40)
    const details = /^(fix|feat)(?:\((\S+)\))?: (.+)$/.exec(commit.slice(40))
    if (!details) continue
    let message = details[3]
    if (details[2]) message = `**${details[2]}:** ${message}`
    updates[details[1]] += `- ${message} (${hash})\n`
  }

  let body = ''
  for (const type in headerMap) {
    if (!updates[type]) continue
    body += `## ${headerMap[type]}\n\n${updates[type]}\n`
  }

  const github = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  console.log(`Start to release a new version with tag ${version} ...`)
  await github.repos.createRelease({
    repo: 'koishi',
    owner: 'koishijs',
    tag_name: version,
    name: `Koishi ${version}`,
    prerelease: !!prerelease(version),
    body,
  })
  console.log('Release created successfully.')
})()
