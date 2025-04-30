#!/usr/bin/env node

/**
 * Comprehensive Kafka health check utility
 * - Verifies Docker containers are running
 * - Handles automatic restart of containers if needed
 * - Tests Kafka connectivity and sends test messages
 * - Provides detailed diagnostics and recovery options
 *
 * This script consolidates both the shell script and node test functionality
 * into a single, maintainable solution.
 *
 * Run with: node scripts/kafka-health-check.js
 */

const { execSync, spawn } = require('child_process')
const { Kafka } = require('kafkajs')
const path = require('path')
const fs = require('fs')

// Configuration
const CONFIG = {
  containersToCheck: [
    'events-kafka-1',
    'events-zookeeper-1',
    'events-kafka-ui-1'
  ],
  kafkaPort: 29092,
  kafkaHost: '127.0.0.1',
  dockerComposeFile: path.resolve(__dirname, '../src/events/kafka-cluster.yml'),
  initWaitTime: 15000, // Wait 15 seconds for containers to fully initialize
  retries: 5,
  maxRetryTime: 5000
}

// Colored console output helpers
const logger = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`), // Cyan
  success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`), // Green
  warn: (msg) => console.log(`\x1b[33m⚠️ ${msg}\x1b[0m`), // Yellow
  error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`), // Red
  highlight: (msg) => console.log(`\x1b[35m${msg}\x1b[0m`) // Magenta
}

/**
 * Main health check function that orchestrates the entire process
 */
async function checkKafkaHealth() {
  try {
    // Step 1: Check if required Docker containers are running
    const containersStatus = checkContainersStatus()

    // Step 2: If containers are not running or missing, restart them
    if (!containersStatus.allRunning) {
      logger.warn('Some Kafka containers are not running.')
      logger.info('Attempting to restart Kafka stack...')

      await restartKafkaStack()

      // Verify containers after restart
      const statusAfterRestart = checkContainersStatus()
      if (!statusAfterRestart.allRunning) {
        logger.error(
          'Failed to start all required Kafka containers after restart'
        )
        process.exit(1)
      }
    } else {
      logger.success('All Kafka containers are running')
    }

    // Step 3: Test Kafka connectivity and functionality
    await testKafkaConnectivity()

    logger.success('Kafka setup is healthy and ready to use')
    return true
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

/**
 * Check if all required Docker containers are running
 */
function checkContainersStatus() {
  try {
    logger.info('Checking Kafka container status...')

    const runningContainers = execSync('docker ps --format "{{.Names}}"')
      .toString()
      .trim()
      .split('\n')

    const status = {
      allRunning: true,
      containers: {}
    }

    CONFIG.containersToCheck.forEach((container) => {
      const isRunning = runningContainers.includes(container)
      status.containers[container] = isRunning
      if (!isRunning) status.allRunning = false
    })

    return status
  } catch (error) {
    logger.error(`Failed to check container status: ${error.message}`)
    return { allRunning: false, containers: {} }
  }
}

/**
 * Restart the Kafka stack using Docker Compose
 */
async function restartKafkaStack() {
  try {
    // Stop any existing containers
    logger.info('Stopping existing Kafka containers...')
    execSync(`docker compose -f "${CONFIG.dockerComposeFile}" down`, {
      stdio: 'inherit'
    })

    // Small delay to ensure clean shutdown
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Start the stack
    logger.info('Starting Kafka containers...')
    execSync(`docker compose -f "${CONFIG.dockerComposeFile}" up -d`, {
      stdio: 'inherit'
    })

    // Wait for initialization
    logger.info(
      `Waiting ${CONFIG.initWaitTime / 1000} seconds for Kafka to initialize...`
    )
    await new Promise((resolve) => setTimeout(resolve, CONFIG.initWaitTime))

    return true
  } catch (error) {
    logger.error(`Failed to restart Kafka stack: ${error.message}`)
    throw error
  }
}

/**
 * Test Kafka connectivity by connecting, listing topics, and sending a test message
 */
async function testKafkaConnectivity() {
  // Configure Kafka client
  const kafka = new Kafka({
    clientId: 'kafka-health-check',
    // Use only localhost which matches the EXTERNAL advertised listener
    brokers: ['localhost:29092'],
    retry: {
      retries: CONFIG.retries,
      initialRetryTime: 500,
      maxRetryTime: CONFIG.maxRetryTime
    },
    connectionTimeout: 10000
  })

  const producer = kafka.producer()
  const admin = kafka.admin()

  try {
    // Test admin connectivity
    logger.info('Testing Kafka admin connectivity...')
    await admin.connect()
    logger.success('Connected to Kafka admin')

    // List topics
    const topics = await admin.listTopics()
    logger.success(`Found ${topics.length} topics: ${topics.join(', ')}`)

    // Create test topic if needed
    const testTopicName = 'health-check-topic'
    if (!topics.includes(testTopicName)) {
      logger.info(`Creating test topic '${testTopicName}'...`)
      await admin.createTopics({
        topics: [
          { topic: testTopicName, numPartitions: 1, replicationFactor: 1 }
        ]
      })
      logger.success(`Created '${testTopicName}' topic`)
    }

    // Test producer connectivity
    logger.info('Testing Kafka producer...')
    await producer.connect()
    logger.success('Connected to Kafka producer')

    // Send test message
    const testMessage = {
      id: Date.now(),
      message: 'Kafka health check',
      timestamp: new Date().toISOString()
    }

    await producer.send({
      topic: testTopicName,
      messages: [
        {
          key: 'health-check',
          value: JSON.stringify(testMessage)
        }
      ]
    })

    logger.success('Test message sent successfully')

    // Clean up connections
    await producer.disconnect()
    await admin.disconnect()

    logger.highlight('🎉 Kafka connectivity test completed successfully')
    return true
  } catch (error) {
    logger.error(`Kafka connectivity test failed: ${error.message}`)
    if (admin.isConnected()) await admin.disconnect().catch(() => {})
    if (producer.isConnected()) await producer.disconnect().catch(() => {})
    throw error
  }
}

// Execute the health check
checkKafkaHealth().catch((error) => {
  logger.error(`Fatal error: ${error.message}`)
  process.exit(1)
})
