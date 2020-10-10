import * as axios from "axios";
import * as formData from "form-data";
export default (config: axios.AxiosRequestConfig, session = null) => {
  if (config.url === "sessions") {
    config.auth = {
      username: process.env.email,
      password: process.env.password,
    };
  }
  if (session && session.access_token) {
    config.headers["Authorization"] = ` Token token=${session.access_token}`;
  }

  if (config.data instanceof formData) {
    Object.assign(config.headers, config.data.getHeaders());
  }
  return config;
};
