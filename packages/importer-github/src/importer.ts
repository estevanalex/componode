import { Octokit } from "octokit";
import type { DiscoveredAsset, Importer, ImporterContext } from "@componode/core";
import type { GithubConfig } from "./config.js";

interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  html_url: string;
  fork: boolean;
  archived: boolean;
  language: string | null;
  topics: string[] | null | undefined;
  visibility: string | null;
  default_branch: string | null;
  updated_at: string | null;
  pushed_at: string | null;
}

function generateComponentSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function* listOrgRepos(
  octokit: Octokit,
  config: GithubConfig,
  signal: AbortSignal,
): AsyncGenerator<GithubRepo> {
  const org = config.org;

  if (config.repos && config.repos.length > 0) {
    for (const repo of config.repos) {
      if (signal.aborted) return;
      const [owner, repoName] = (repo.includes("/") ? repo.split("/", 2) : [org, repo]) as [string, string];
      const response = await octokit.rest.repos.get({
        owner,
        repo: repoName,
        signal,
      });
      yield response.data as GithubRepo;
    }
    return;
  }

  const iterator = octokit.paginate.iterator(octokit.rest.repos.listForOrg, {
    org,
    type: "all",
    per_page: 100,
    signal,
  });

  for await (const { data } of iterator) {
    if (signal.aborted) return;
    for (const repo of data as GithubRepo[]) {
      yield repo;
    }
  }
}

function buildDiscoveredAsset(repo: GithubRepo): DiscoveredAsset {
  const defaultBranch = repo.default_branch ?? "main";
  const pushedAt = repo.pushed_at ?? repo.updated_at ?? null;

  return {
    category: "REPOSITORY",
    provider: "GITHUB",
    resourceType: "github:repository",
    name: repo.full_name,
    externalId: repo.full_name,
    slug: generateComponentSlug(repo.name),
    details: {
      language: repo.language,
      topics: repo.topics ?? [],
      visibility: repo.visibility,
      htmlUrl: repo.html_url,
    },
    instances: [
      {
        environment: "PRODUCTION",
        externalId: defaultBranch,
        url: repo.html_url,
        status: "RUNNING",
        version: defaultBranch,
        deployedAt: pushedAt,
        rawConfig: {
          defaultBranch,
          visibility: repo.visibility,
        },
      },
    ],
  };
}

export class GithubImporter implements Importer {
  readonly name = "github";
  readonly version = "1.0.0";

  async *run(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    context: ImporterContext,
  ): AsyncGenerator<DiscoveredAsset> {
    const parsed = config as GithubConfig;
    context.reportPhase("Authenticating");

    const token = secrets.token;
    const octokit = new Octokit({ auth: token });

    context.reportPhase("Listing repositories");

    for await (const repo of listOrgRepos(octokit, parsed, context.signal)) {
      if (context.signal.aborted) {
        return;
      }

      if (!parsed.includeForks && repo.fork) continue;
      if (!parsed.includeArchived && repo.archived) continue;

      context.reportPhase(`Processing ${repo.full_name}`);
      yield buildDiscoveredAsset(repo);
    }

    context.reportPhase("Completed");
  }
}
