const BaseConnector = require('../BaseConnector');
const { postRequest, getRequest } = require('../../utils/httpClient');

class Connector extends BaseConnector {
  async handlePath(path, requestData, res) {
    switch (path) {
      case 'whatsapp':
        return this.whatsapp(requestData, res);

      default:
        throw new Error('Invalid path');
    }
  };

  getBaseUrl() {
    return `https://api.callmebot.com`;
  };

  async whatsapp({ phone, text }, res) {
    const credentials = await this.getCredentials(res);

    if(credentials) {
      const { api_key } = credentials;

      let url = new URL(`${this.getBaseUrl()}/whatsapp.php`);

      const params = new URLSearchParams();
      params.append("apikey", api_key);
      params.append("phone", phone);
      params.append("text", text);
      
      url.search = params.toString();

      console.log('request URL', url.toString())

      const responseData = await getRequest(url.toString());

      if(responseData.error) {
        return this.handleError(res, responseData.error)
      } else {
        res.json(responseData);
      }
    }
  };
}

module.exports = Connector;
