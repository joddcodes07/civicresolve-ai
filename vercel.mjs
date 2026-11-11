const renderUrl = process.env.VITE_SOCKET_URL?.trim()
const apiRewrites = []

if (renderUrl) {
  const url = new URL(renderUrl)
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_SOCKET_URL must be the HTTPS origin of the Render API')
  }
  for (const path of ['api', 'uploads']) {
    apiRewrites.push({ source: `/${path}/:path*`, destination: `${url.origin}/${path}/:path*` })
  }
}

export const config = {
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDirectory: 'client/dist',
  rewrites: [...apiRewrites, { source: '/(.*)', destination: '/index.html' }],
}
