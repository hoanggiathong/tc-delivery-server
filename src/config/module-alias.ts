import moduleAlias from 'module-alias';
import path from 'path';

// Setup module alias based on environment
const setupModuleAlias = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Development: point to src directory from project root
    const rootDir = path.resolve(__dirname, '../..');
    moduleAlias.addAlias('@', path.join(rootDir, 'src'));
  } else {
    // Production: we're in dist/src/config, so go up one level to dist/src
    const distSrcDir = path.resolve(__dirname, '..');
    moduleAlias.addAlias('@', distSrcDir);
  }
};

export default setupModuleAlias;