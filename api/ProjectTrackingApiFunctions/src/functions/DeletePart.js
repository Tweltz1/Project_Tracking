const { CosmosClient } = require("@azure/cosmos");
module.exports = async function (context, req) {
    context.log('DeletePart HTTP trigger function processed a request.');
    const partId = (req.query.id || (req.body && req.body.id));
    if (!partId) { context.res = { status: 400, body: "Please pass a part ID." }; return; }
    const connectionString = process.env.CosmosDbConnectionString;
    if (!connectionString) { context.res = { status: 500, body: "Cosmos DB connection string not configured." }; return; }
    const client = new CosmosClient(connectionString);
    const database = client.database("ProjectTrackingDB");
    const container = database.container("Parts");
    try {
        // AUTHENTICATION/AUTHORIZATION GOES HERE: Validate JWT token.
        await container.item(partId, partId).delete();
        context.res = { status: 204, body: null }; // 204 No Content
    } catch (error) {
        context.log.error("Error deleting part:", error);
        if (error.code === 404) { context.res = { status: 404, body: `Part with ID '${partId}' not found.` }; }
        else { context.res = { status: 500, body: "Error deleting part: " + error.message }; }
    }
};