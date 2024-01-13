const axios = require('axios');

// Function to make an HTTP request with error handling
async function makeRequest(method, url, data, headers = {}) {
  try {
    const response = await axios({
      method,
      url,
      data,
      headers,
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      return {
        error: {
          status,
          data
        }
      }
    } else {
      console.log(error)
      return {
        error: {
          status: 500,
          data: {
            message: 'Internal Server Error'
          }
        }
      }
    }
  }
}

// Functions for common HTTP methods

async function postRequest(url, data, headers = {}) {
  return makeRequest('post', url, data, headers);
}

async function getRequest(url, headers = {}) {
  return makeRequest('get', url, null, headers);
}

async function putRequest(url, data, headers = {}) {
  return makeRequest('put', url, data, headers);
}

async function deleteRequest(url, headers = {}) {
  return makeRequest('delete', url, null, headers);
}

module.exports = { postRequest, getRequest, putRequest, deleteRequest };
