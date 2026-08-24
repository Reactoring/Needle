export default {
  routes: [
    {
      method: 'POST',
      path: '/demo/session',
      handler: 'demo.session',
      config: { auth: false },
    },
  ],
};
