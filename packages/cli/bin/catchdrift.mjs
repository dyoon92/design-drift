#!/usr/bin/env node
/**
 * catchdrift — CLI entry point
 * Usage:
 *   npx catchdrift init          Install Drift into any React project
 *   npx catchdrift check         Run headless drift scan against a running app
 *   npx catchdrift status        Show current DS coverage snapshot
 *   npx catchdrift --help
 *   npx catchdrift --version
 */

import { run } from '../src/index.mjs'
run(process.argv.slice(2))
