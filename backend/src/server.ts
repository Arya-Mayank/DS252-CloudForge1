import app from './app';
import { testSupabaseConnection, isSupabaseMockMode } from './config/supabase.config';
import { isAzureMockMode } from './config/azure.config';

const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    console.log('🚀 Starting DoodleOnMoodle API Server...\n');

    // Check Supabase status
    if (isSupabaseMockMode()) {
      console.warn('\n⚠️  SUPABASE NOT CONFIGURED');
      console.warn('   The server will start, but database operations will fail.');
      console.warn('   Add SUPABASE_URL and SUPABASE_KEY to .env for core functionality.\n');
    } else {
      // Test Supabase connection
      console.log('📊 Testing Supabase connection...');
      const supabaseConnected = await testSupabaseConnection();
      if (!supabaseConnected) {
        console.warn('⚠️  Supabase connection test failed. Please check your credentials.');
        console.warn('   Database operations may fail.\n');
      }
    }

    // Check Azure services status
    if (isAzureMockMode()) {
      console.log('\n⚠️  AZURE SERVICES IN MOCK MODE');
      console.log('   Add Azure credentials to .env to enable:');
      console.log('   - Azure OpenAI (AI Foundry) for real AI features');
      console.log('   - Azure Blob Storage for cloud file storage');
      console.log('   - Azure Cognitive Search for vector embeddings\n');
    } else {
      console.log('\n✅ Azure services configured');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API base URL: http://localhost:${PORT}/api`);
      console.log(`\n📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n🎓 DoodleOnMoodle LMS API is ready!\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

