const express = require('express');
const crypto = require('crypto');

const { getConnection } = require('../utils/dbConnection');

const router = express.Router();

if(!process.env.ENCRYPTION_KEY) throw `\`$ENCRYPTION_KEY\` is not set`;

// Function to encrypt data using a key from env vars
function encryptData(data) {
  const key = process.env.ENCRYPTION_KEY;
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encryptedData = cipher.update(data, 'utf-8', 'hex');
  encryptedData += cipher.final('hex');
  return encryptedData;
}

// Function to decrypt data using a key from env vars
function decryptData(encryptedData) {
  const key = process.env.ENCRYPTION_KEY;
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf-8');
  decryptedData += decipher.final('utf-8');
  return decryptedData;
}

// Utility function to fetch and decrypt credentials based on service_id
async function fetchDecryptedCredentials(serviceId) {
  try {
    const connection = await getConnection();

    console.log(`fetching credentials`, serviceId)
    const [credentials] = await connection.query('SELECT * FROM credentials WHERE service_id = ?', [serviceId]);

    if (credentials.length === 0) {
      return null; // No credentials found for the given service_id
    }

    return credentials.map(credential => ({
      ...credential,
      value: JSON.parse(decryptData(credential.value))
    }));
  } catch (error) {
    throw new Error('Error fetching decrypted credentials');
  }
}

// Function to create or update credentials based on service_id
async function createOrUpdateCredentials({service_id, name, value}) {
  try {
    const connection = await getConnection();

    // Check if credentials already exist for the given service_id
    const [existingCredentials] = await connection.query('SELECT * FROM credentials WHERE service_id = ?', [service_id]);

    if (existingCredentials.length === 0) {
      // If no credentials found, create new credentials
      const encryptedValue = encryptData(value);
      await connection.query('INSERT INTO credentials (name, service_id, value) VALUES (?, ?, ?)', [
        name,
        service_id,
        encryptedValue,
      ]);
    } else {
      // If credentials exist, update the existing ones
      const encryptedValue = encryptData(value);
      await connection.query('UPDATE credentials SET name = ?, value = ? WHERE service_id = ?', [name, encryptedValue, service_id]);
    }
  } catch (error) {
    console.log(error);
    throw new Error('Error creating or updating credentials');
  }
}

// Endpoint to get all credentials
router.get('/credentials', async (req, res) => {
  try {
    const connection = await getConnection();
    const [credentials] = await connection.query('SELECT * FROM credentials');
    // const result = credentials.map(({value, ...rest}) => rest);
    const result = credentials;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to create a new credential
router.post('/credentials', async (req, res) => {
  const { name, service_id, value } = req.body;

  // Validate presence of name, service_id, and value
  if (!name || !service_id || !value) {
    return res.status(400).json({ error: 'Name, service_id, and value are required fields' });
  }

  try {
    const connection = await getConnection();
    const encryptedValue = encryptData(value);

    await connection.query('INSERT INTO credentials (name, service_id, value) VALUES (?, ?, ?)', [
      name,
      service_id,
      encryptedValue,
    ]);

    res.status(201).json({ message: 'Credential created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to update a credential
router.put('/credentials/:id', async (req, res) => {
  const credentialId = req.params.id;
  const { name, service_id, value } = req.body;

  // Validate presence of name, service_id, and value
  if (!name || !service_id || !value) {
    return res.status(400).json({ error: 'Name, service_id, and value are required fields' });
  }

  try {
    const connection = await getConnection();
    const encryptedValue = encryptData(value);

    await connection.query('UPDATE credentials SET name = ?, service_id = ?, value = ? WHERE id = ?', [
      name,
      service_id,
      encryptedValue,
      credentialId,
    ]);

    res.json({ message: 'Credential updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to delete a credential
router.delete('/credentials/:id', async (req, res) => {
  const credentialId = req.params.id;

  try {
    const connection = await getConnection();
    await connection.query('DELETE FROM credentials WHERE id = ?', [credentialId]);

    res.json({ message: 'Credential deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = { router, fetchDecryptedCredentials, createOrUpdateCredentials };
