const { CosmosClient } = require("@azure/cosmos");
module.exports = async function (context, req) {
    context.log('GetPartById HTTP trigger function processed a request.');
    const partId = (req.query.id || (req.body && req.body.id));
    if (!partId) { context.res = { status: 400, body: "Please pass a part ID." }; return; }
    const connectionString = process.env.CosmosDbConnectionString;
    if (!connectionString) { context.res = { status: 500, body: "Cosmos DB connection string not configured." }; return; }
    const client = new CosmosClient(connectionString);
    const database = client.database("ProjectTrackingDB");
    const container = database.container("Parts");
    try {
        // AUTHENTICATION/AUTHORIZATION GOES HERE: Validate JWT token.
        const { resource: part } = await container.item(partId, partId).read();
        if (part) { context.res = { status: 200, body: part, headers: { 'Content-Type': 'application/json' } }; }
        else { context.res = { status: 404, body: `Part with ID '${partId}' not found.` }; }
    } catch (error) {
        context.log.error("Error fetching part by ID:", error);
        context.res = { status: 500, body: "Error fetching part: " + error.message };
    }
};