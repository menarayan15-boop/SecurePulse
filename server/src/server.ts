import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  SECUREPULSE ADAPTIVE SECURITY SYSTEM`);
      console.log(`  Backend Engine listening on http://localhost:${PORT}`);
      console.log(`  Timezone Engine: Asia/Kolkata (IST)`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
