const BaseConnector = require('../BaseConnector');
const { postRequest, getRequest } = require('../../utils/httpClient');
const { createOrUpdateCredentials, fetchDecryptedCredentials } = require('../../credentials');

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

      let url = `${this.getBaseUrl(tier)}/whatsapp.php`;

      const params = new URLSearchParams();
      params.append("phone", phone);
      params.append("text", text);
      
      url.search = params.toString();

      const responseData = await getRequest(url);

      if(responseData.error) {
        return this.handleError(res, responseData.error)
      } else {
        res.json(responseData);
      }
    }
  };
}

module.exports = Connector;
