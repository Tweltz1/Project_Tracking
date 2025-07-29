const { CosmosClient } = require("@azure/cosmos");
module.exports = async function (context, req) {
    context.log('GetParts HTTP trigger function processed a request.');
    const connectionString = process.env.CosmosDbConnectionString;
    if (!connectionString) { context.res = { status: 500, body: "Cosmos DB connection string not configured." }; return; }
    const client = new CosmosClient(connectionString);
    const database = client.database("ProjectTrackingDB");
    const container = database.container("Parts");
    try {
        // AUTHENTICATION/AUTHORIZATION GOES HERE: Validate JWT token from Azure AD B2C.
        const { resources: parts } = await container.items.query("SELECT * FROM c").fetchAll();
        context.res = { status: 200, body: parts, headers: { 'Content-Type': 'application/json' } };
    } catch (error) {
        context.log.error("Error fetching parts:", error);
        context.res = { status: 500, body: "Error fetching parts: " + error.message };
    }
};
