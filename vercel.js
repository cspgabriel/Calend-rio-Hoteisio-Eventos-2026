export default {
  // Ensure client-side routing works on Vercel for paths like /admin
  // by rewriting all requests to the SPA entry point.
  rewrites: [
    { source: '/(.*)', destination: '/index.html' }
  ],
};
