import express from 'express';
import dotenv from 'dotenv';
import { logger } from '../util/log.js';
import { createTaskHandler } from './tools/omnifocus.create_task.js';
import { findTasksHandler } from './tools/omnifocus.find_tasks.js';
import { appendNoteHandler } from './tools/omnifocus.append_note.js';
import { pullTicketsHandler } from './tools/jira.pull_tickets.js';
import { pullTicketsFromXmlHandler } from './tools/jira.pull_tickets_from_xml.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.MCP_PORT || 3333;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP Tool Endpoints
app.post('/omnifocus/create_task', createTaskHandler);
app.post('/omnifocus/find_tasks', findTasksHandler);
app.post('/omnifocus/append_note', appendNoteHandler);
app.post('/jira/pull_tickets', pullTicketsHandler);
app.post('/jira/pull_tickets_from_xml', pullTicketsFromXmlHandler);

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${error.message}`);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
  logger.info(`MCP Server running on port ${port}`);
  logger.info('Available endpoints:');
  logger.info('  POST /omnifocus/create_task');
  logger.info('  POST /omnifocus/find_tasks');
  logger.info('  POST /omnifocus/append_note');
  logger.info('  POST /jira/pull_tickets');
  logger.info('  POST /jira/pull_tickets_from_xml');
  logger.info('  GET  /health');
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down MCP server...');
  process.exit(0);
}); 