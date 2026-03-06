#!/usr/bin/env node

/**
 * AI Config Generator
 *
 * Uses OpenAI API to generate optimized configuration files
 * for dev, prod, and copilot environments.
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CONFIG_DIR = path.join(__dirname, '..', 'config');

async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.mkdir(path.join(CONFIG_DIR, 'history'), { recursive: true });
  } catch (error) {
    console.error('Error creating config directories:', error);
  }
}

async function generateConfig(environment) {
  console.log(`🤖 Generating AI config for ${environment} environment...`);

  const prompt = `Generate a JSON configuration for an AI swarm platform in ${environment} environment.

  Include:
  - swarm settings (max_agents, agent_types, coordination_strategy)
  - repository settings (auto_create, pr_strategy, branch_naming)
  - analytics settings (tracking_enabled, metrics_to_collect)
  - deployment settings (auto_deploy, health_checks, scaling)

  Return only valid JSON without any markdown formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a DevOps configuration expert. Generate production-ready configs in JSON format only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content.trim();

    // Extract JSON from markdown if wrapped
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonContent = content.split('```')[1].split('```')[0].trim();
    }

    const config = JSON.parse(jsonContent);

    // Add metadata
    config.generated_at = new Date().toISOString();
    config.environment = environment;
    config.version = '1.0.0';

    const configPath = path.join(CONFIG_DIR, `${environment}.json`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    console.log(`✅ Config saved to ${configPath}`);

    // Save to history
    const historyPath = path.join(CONFIG_DIR, 'history', `${environment}-${Date.now()}.json`);
    await fs.writeFile(historyPath, JSON.stringify(config, null, 2));

    return config;
  } catch (error) {
    console.error(`❌ Error generating config for ${environment}:`, error.message);

    // Fallback to default config
    const defaultConfig = {
      environment,
      generated_at: new Date().toISOString(),
      version: '1.0.0',
      swarm: {
        max_agents: environment === 'prod' ? 10 : 3,
        agent_types: ['code_generator', 'pr_manager', 'qa_validator'],
        coordination_strategy: 'distributed',
      },
      repository: {
        auto_create: environment !== 'prod',
        pr_strategy: 'feature_branch',
        branch_naming: 'ai-swarm/{agent_id}/{task_id}',
      },
      analytics: {
        tracking_enabled: true,
        metrics_to_collect: ['repo_created', 'pr_opened', 'pr_merged', 'agent_activity'],
      },
      deployment: {
        auto_deploy: environment === 'dev',
        health_checks: true,
        scaling: {
          enabled: environment === 'prod',
          min_agents: 1,
          max_agents: environment === 'prod' ? 10 : 3,
        },
      },
    };

    const configPath = path.join(CONFIG_DIR, `${environment}.json`);
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`✅ Fallback config saved to ${configPath}`);

    return defaultConfig;
  }
}

async function main() {
  console.log('🚀 AI Config Generator Starting...\n');

  await ensureConfigDir();

  const environments = ['dev', 'prod', 'copilot'];

  for (const env of environments) {
    await generateConfig(env);
    console.log('');
  }

  console.log('✨ All configs generated successfully!');
  console.log(`📁 Configs saved to: ${CONFIG_DIR}`);
}

main().catch(console.error);
