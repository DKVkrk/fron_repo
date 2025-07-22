export const baseURL = import.meta.env.VITE_APP_SERVER_DOMAIN || "http://localhost:8000";

const SummaryApi = {
  register: {
    method: 'post',
    url: 'http://localhost:8000/api/user/register/user', // <-- FIXED!
  }
};

export default SummaryApi;