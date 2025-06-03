const config = {
  API_URL: process.env.REACT_APP_API_URL,
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL,
  ENV: process.env.REACT_APP_ENV || 'development'
};

export default config;
