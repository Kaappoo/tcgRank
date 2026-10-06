import { config } from 'dotenv'

// Imported first by scripts so modules that read process.env at load time see .env values.
config({ path: ['.env.local', '.env'], quiet: true })
