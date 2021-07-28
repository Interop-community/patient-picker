const Config = {
  "prod": {
    "localCookieName": "hspc-picker-start-route",
    "sessionStorageName": "hspcAuthorized",
    "sessionCookieName": "JSESSIONID",
    "personaCookieName": "hspc-persona-token",
    "authServerUrl": "https://dev-iol2sandboxapi.interop.community",
    "cookieDomain": "interop.community"
  },
  "dev": {
    "localCookieName": "hspc-picker-start-route",
    "sessionStorageName": "hspcAuthorized",
    "sessionCookieName": "JSESSIONID",
    "personaCookieName": "hspc-persona-token",
    "authServerUrl": "http://localhost:12000",
    "cookieDomain": "localhost"
  },
  "local": {
    "localCookieName": "hspc-picker-start-route",
    "sessionStorageName": "hspcAuthorized",
    "sessionCookieName": "JSESSIONID",
    "personaCookieName": "hspc-persona-token",
    "authServerUrl": "http://localhost:12000",
    "cookieDomain": "localhost"
  }
}

export default Config 