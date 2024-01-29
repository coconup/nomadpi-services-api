const express = require('express');
const knex = require('knex');

const { router: credentialsController } = require('./credentials');
const { loadManifest, getAllServicesManifests, validateAllManifests } = require('./services/manifestLoader');

const app = express();
const port = process.env.PORT || 3000;

if(!process.env.ALLOWED_ORIGINS) throw `\`$ALLOWED_ORIGINS\` is not set`;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(s => !!s).map(s => s.trim());

// Migration configuration
const knexConfig = require('./knexfile');
const knexInstance = knex(knexConfig.development);

// Run migrations
knexInstance.migrate.latest().then(() => {
  console.log('Migrations ran successfully.');

  // Add headers before the routes are defined
  app.use(function (req, res, next) {
    if (allowedOrigins.includes(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    } else {
      console.log(`Rejected request from origin \`${req.headers.origin}\``)
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type,Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
  });

  app.use(express.json());
  app.use(credentialsController);

  // Endpoint to get all services' manifest files grouped by service_type
  app.get('/services', async (req, res) => {
    try {
      const allServicesManifests = await getAllServicesManifests();
      res.json(allServicesManifests);
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Function to dispatch requests to the appropriate service
  app.get('/services/:serviceId', async (req, res) => {
    const serviceId = req.params.serviceId;

    console.log('serviceId', serviceId)
    
    try {
      const manifest = await loadManifest(serviceId);
      const { service_type, service_name, features } = manifest;

      res.json({ service_name, service_type, features });
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.options('/:serviceId/*', (req, res) => {
    // Respond with the allowed methods and headers for the specified resource
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).end();
  });

  // Function to dispatch requests to the appropriate service based on the URL path
  app.use('/services/:serviceId/*', async (req, res) => {
    const serviceId = req.params.serviceId;
    const path = req.params[0]; // Capture the remaining path after :serviceId

    const manifest = await loadManifest(serviceId);
    const { service_type, service_name } = manifest;

    // Load the appropriate connector based on service type
    const ConnectorClass = require(`./services/${serviceId}/connector`);
    const connector = new ConnectorClass();

    const requestData = {
        ...req.body,
        ...req.query
    };

    // Perform actions based on the service type and path
    await connector.handlePath(path, requestData, res);
  });
});

validateAllManifests();

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
