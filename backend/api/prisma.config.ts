import {defineConfig} from 'prisma/config';
import './src/environment';
export default defineConfig({schema:'prisma/schema.prisma',migrations:{path:'prisma/migrations'}});
