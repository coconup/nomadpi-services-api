const BaseConnector = require('../BaseConnector');
const { postRequest, getRequest } = require('../../utils/httpClient');
const { createOrUpdateCredentials, fetchDecryptedCredentials } = require('../../credentials');

class Connector extends BaseConnector {
  async handlePath(path, requestBody) {
    switch (path) {
      case 'login':
        return this.login(requestBody);

      case 'login-verify':
        return this.loginVerify(requestBody);

      case 'homescreen':
        return this.getHomescreen();

      default:
        throw new Error('Invalid path');
    }
  }

  getBaseUrl({ tier='prod' }) {
    return `https://rest-${tier}.immedia-semi.com`;
  }

  async getCredentials(res) {
    const credentials = await fetchDecryptedCredentials(this.serviceId);

    if(!credentials) {
      res.status(401).json({ message: 'missing_credentials' });
    }

    return credentials;
  }

  async login({ email, password }, res) {
    const loginUrl = `${getBaseUrl()}/api/v5/account/login`;
    const loginData = { email, password };

    const responseData = await postRequest(loginUrl, loginData, null);

    if(responseData.error) {
      return this.handleError(res, responseData.error)
    } else {
      res.json(responseData);
    }
  }

  async loginVerify({ tier, account_id, client_id, pin, auth_token }, res) {
    const loginVerifyUrl = `${getBaseUrl(tier)}/api/v4/account/${account_id}/client/${client_id}/pin/verify`;

    const headers = {
      'TOKEN_AUTH': auth_token,
    };

    const loginVerifyData = { pin };

    const responseData = await postRequest(loginVerifyUrl, loginVerifyData, headers);

    if(responseData.error) {
      return this.handleError(res, responseData.error)
    } else {
      const credentialsValue = {
        client_id,
        account_id,
        auth_token,
        tier,
      };

      // Convert the JSON object to a string before storing it in the database
      const credentialsString = JSON.stringify(credentialsValue);
      const serviceName = await this.getServiceName();

      // Use createOrUpdateCredentials function to create or update credentials
      await createOrUpdateCredentials({
        service_id: this.serviceId,
        name: serviceName,
        value: credentialsString
      });
    }

    res.json(responseData);
  }

  async getHomescreen(res) {
    const credentials = await this.getCredentials(res);

    if(credentials) {
      const {
        tier,
        account_id,
        auth_token
      } = credentials;

      const url = `${getBaseUrl(tier)}/api/v3/accounts/${account_id}/homescreen`;
      const headers = {
        'TOKEN_AUTH': auth_token,
      };

      const responseData = await getRequest(url, headers);

      if(responseData.error) {
        return this.handleError(res, responseData.error)
      } else {
        res.json(responseData);
      }
    }
  }

  async refreshThumbnail({ network_id, camera_id }, res) {
    const credentials = await this.getCredentials(res);

    if(credentials) {
      const url = `network/${network_id}/camera/${camera_id}/thumbnail`;
      const headers = {
        'TOKEN_AUTH': credentials.auth_token,
      };

      const responseData = await postRequest(url, {}, headers);

      if(responseData.error) {
        return this.handleError(res, responseData.error)
      } else {
        res.json(responseData);
      }
    }
  }
}

module.exports = Connector;
