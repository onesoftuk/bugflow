import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;
  if (!xReplitToken) throw new Error('X_REPLIT_TOKEN not found');
  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) throw new Error('GitHub not connected');
  return accessToken;
}

function getAllFiles(dir: string, base: string = dir): string[] {
  const ignorePatterns = [
    'node_modules', '.git', 'dist', '.cache', '.replit', 'replit.nix',
    '_push_github.ts', '.config', '.local', '.upm', 'attached_assets',
    'replit.md'
  ];
  let results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignorePatterns.some(p => entry.name === p) || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, base));
    } else {
      results.push(path.relative(base, fullPath));
    }
  }
  return results;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  const repo = 'bugflow';

  console.log(`Pushing to ${owner}/${repo}...`);

  let repoEmpty = false;
  try {
    await octokit.repos.getContent({ owner, repo, path: '' });
  } catch (e: any) {
    if (e.status === 404 || e.status === 409) {
      repoEmpty = true;
    }
  }

  if (repoEmpty) {
    console.log('Repository is empty, initializing...');
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: 'README.md',
      message: 'Initial commit',
      content: Buffer.from('# BugFlow\nBug Tracking & Feature Request Application\n').toString('base64'),
    });
    console.log('Initialized repository with README.');
  }

  const rootDir = '/home/runner/workspace';
  const files = getAllFiles(rootDir);
  console.log(`Found ${files.length} files to push`);

  const treeItems: any[] = [];
  for (const filePath of files) {
    const fullPath = path.join(rootDir, filePath);
    let content: string;
    let encoding: 'utf-8' | 'base64';

    try {
      const buf = fs.readFileSync(fullPath);
      const isBinary = buf.includes(0);
      if (isBinary) {
        content = buf.toString('base64');
        encoding = 'base64';
      } else {
        content = buf.toString('utf-8');
        encoding = 'utf-8';
      }
    } catch {
      continue;
    }

    const { data: blob } = await octokit.git.createBlob({
      owner, repo, content, encoding
    });

    treeItems.push({
      path: filePath,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: blob.sha,
    });

    if (treeItems.length % 20 === 0) {
      console.log(`  Uploaded ${treeItems.length}/${files.length} files...`);
    }
  }

  console.log(`All ${treeItems.length} files uploaded. Creating tree...`);

  const { data: tree } = await octokit.git.createTree({
    owner, repo, tree: treeItems
  });

  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
  const parentSha = ref.object.sha;

  const { data: commit } = await octokit.git.createCommit({
    owner, repo,
    message: 'BugFlow - Bug Tracking & Feature Request App',
    tree: tree.sha,
    parents: [parentSha],
  });

  await octokit.git.updateRef({
    owner, repo, ref: 'heads/main', sha: commit.sha, force: true
  });

  console.log(`\nPushed successfully to https://github.com/${owner}/${repo}`);
}

main().catch(e => { console.error(e); process.exit(1); });
