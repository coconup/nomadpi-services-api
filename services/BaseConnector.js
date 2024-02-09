const path = require('path');
const { loadManifest } = require('./manifestLoader');
const { fetchDecryptedCredentials } = require('../credentials');

class BaseConnector {
  get serviceId() {
    try {
      // Get the current file path (assuming connector.js is in the services folder)
      const filePath = module.parent.filename;

      // Extract service_id from the parent directory
      const serviceId = path.basename(path.dirname(filePath));

      return serviceId;
    } catch (error) {
      throw error;
    }
  };

  async getServiceName() {
    const manifest = await loadManifest(this.serviceId);
    const { service_name } = manifest;
    return service_name;
  };

  async handlePath(path, requestBody, res) {
    throw `handlePath not implemented`
  };

  async getCredentials(res) {
    const credentials = await fetchDecryptedCredentials(this.serviceId);

    if(!credentials) {
      res.status(401).json({ message: 'missing_credentials' });
    } else {
      return credentials[0].value;
    }
  };

  handleError(res, error) {
    const {
      status,
      data
    } = error;

    if(!status || !data) throw `Invalid error object`;

    res.status(status).json(data);
  };
}

module.exports = BaseConnector;
